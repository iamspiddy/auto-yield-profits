import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Loader2 } from 'lucide-react';

interface CryptoChartProps {
  className?: string;
}

const CryptoChart: React.FC<CryptoChartProps> = ({ className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const coins = [
    { value: 'BTC', label: 'Bitcoin (BTC)', symbol: 'BTCUSDT' },
    { value: 'ETH', label: 'Ethereum (ETH)', symbol: 'ETHUSDT' },
    { value: 'BNB', label: 'BNB (BNB)', symbol: 'BNBUSDT' }
  ];

  useEffect(() => {
    // Load TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('TradingView script loaded successfully');
      createChart();
    };
    script.onerror = () => {
      console.error('Failed to load TradingView script');
      setError('Failed to load chart widget');
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (window.TradingView) {
      console.log('TradingView widget available, creating chart for:', selectedCoin);
      createChart();
    }
  }, [selectedCoin]);

  const createChart = () => {
    if (!chartContainerRef.current || !window.TradingView) {
      console.error('Chart container or TradingView not available');
      return;
    }

    console.log('Creating chart for coin:', selectedCoin);

    // Clear previous chart
    chartContainerRef.current.innerHTML = '';

    const selectedCoinData = coins.find(coin => coin.value === selectedCoin);
    if (!selectedCoinData) {
      console.error('Selected coin data not found');
      return;
    }

    try {
      new window.TradingView.widget({
        symbol: `BINANCE:${selectedCoinData.symbol}`,
        interval: '1D',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: chartContainerRef.current.id,
        width: '100%',
        height: '100%',
        hide_top_toolbar: true,
        hide_legend: false,
        save_image: false,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        gridColor: 'rgba(255, 255, 255, 0.1)',
        watermark: {
          color: 'rgba(255, 255, 255, 0.1)',
          fontSize: 12,
          text: 'Forexcomplex',
          visible: true
        },
        loading_screen: {
          backgroundColor: 'rgba(0, 0, 0, 0)',
          foregroundColor: 'rgba(255, 255, 255, 0.8)'
        }
      });

      console.log('Chart created successfully');
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error creating chart:', err);
      setError('Failed to create chart');
      setLoading(false);
    }
  };

  // Load user's preferred coin from localStorage
  useEffect(() => {
    const savedCoin = localStorage.getItem('preferred-crypto-coin');
    if (savedCoin && coins.find(coin => coin.value === savedCoin)) {
      setSelectedCoin(savedCoin);
    }
  }, []);

  // Save user's coin preference
  const handleCoinChange = (value: string) => {
    setSelectedCoin(value);
    localStorage.setItem('preferred-crypto-coin', value);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Market Overview
          </CardTitle>
          <Select value={selectedCoin} onValueChange={handleCoinChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {coins.map((coin) => (
                <SelectItem key={coin.value} value={coin.value}>
                  {coin.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-64">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading chart...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <button 
                  onClick={createChart}
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          <div 
            id="tradingview-chart"
            ref={chartContainerRef}
            className="w-full h-full border border-muted rounded-lg"
            style={{ minHeight: '256px' }}
          />
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Live market data from Binance • For informational purposes only
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoChart; 