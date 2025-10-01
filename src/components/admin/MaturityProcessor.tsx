import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react';
import { runMaturityWorkflow, getMaturityStats } from '@/utils/maturityProcessor';
import { toast } from '@/hooks/use-toast';

interface MaturityStats {
  totalMatured: number;
  totalPayout: number;
  pendingProcessing: number;
}

interface WorkflowResult {
  statusUpdated: number;
  investmentsProcessed: number;
  totalPayout: number;
  errors: string[];
}

const MaturityProcessor: React.FC = () => {
  const [stats, setStats] = useState<MaturityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<WorkflowResult | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const statsData = await getMaturityStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching maturity stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch maturity statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processMaturities = async () => {
    try {
      setProcessing(true);
      const result = await runMaturityWorkflow();
      setLastResult(result);
      
      if (result.errors.length > 0) {
        toast({
          title: "Processing Completed with Errors",
          description: `${result.investmentsProcessed} investments processed, ${result.errors.length} errors occurred`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Processing Completed",
          description: `Successfully processed ${result.investmentsProcessed} investments. Total payout: $${result.totalPayout.toFixed(2)}`,
        });
      }
      
      // Refresh stats after processing
      await fetchStats();
    } catch (error: any) {
      console.error('Error processing maturities:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process maturities",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Maturity Processor</span>
            </div>
            <Button
              onClick={fetchStats}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    Total Matured
                  </h3>
                </div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalMatured}
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All time matured investments
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    Total Payout
                  </h3>
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(stats.totalPayout)}
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Total maturity payouts
                </p>
              </div>

              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                    Pending
                  </h3>
                </div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {stats.pendingProcessing}
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Awaiting processing
                </p>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {stats && stats.pendingProcessing > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{stats.pendingProcessing}</strong> investments are matured and ready for processing.
                Click "Process Maturities" to release funds to users.
              </AlertDescription>
            </Alert>
          )}

          {stats && stats.pendingProcessing === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All matured investments have been processed. No pending maturities.
              </AlertDescription>
            </Alert>
          )}

          {/* Process Button */}
          <div className="flex justify-center">
            <Button
              onClick={processMaturities}
              disabled={processing || !stats || stats.pendingProcessing === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {processing ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Process Maturities
                </>
              )}
            </Button>
          </div>

          {/* Last Processing Result */}
          {lastResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Processing Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {lastResult.statusUpdated}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status Updated</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {lastResult.investmentsProcessed}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Investments Processed</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(lastResult.totalPayout)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Payout</p>
                  </div>
                </div>

                {lastResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">Errors ({lastResult.errors.length})</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {lastResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaturityProcessor;
