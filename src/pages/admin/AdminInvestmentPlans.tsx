import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { InvestmentService, type InvestmentPlan } from '@/lib/investmentService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminInvestmentPlans: React.FC = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [formData, setFormData] = useState({
    plan_name: '',
    min_amount: '',
    weekly_profit_percent: '',
    duration_weeks: '',
    is_active: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await InvestmentService.getInvestmentPlans();
      // Get all plans including inactive ones for admin
      const { data: allPlans, error } = await supabase
        .from('investment_plans')
        .select('*')
        .order('min_amount', { ascending: true });

      if (error) throw error;
      setPlans(allPlans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to load investment plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        plan_name: formData.plan_name,
        min_amount: parseFloat(formData.min_amount),
        weekly_profit_percent: parseFloat(formData.weekly_profit_percent),
        duration_weeks: formData.duration_weeks ? parseInt(formData.duration_weeks) : null,
        is_active: formData.is_active
      };

      if (editingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('investment_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Investment plan updated successfully",
        });
      } else {
        // Create new plan
        const { error } = await supabase
          .from('investment_plans')
          .insert(planData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Investment plan created successfully",
        });
      }

      setShowDialog(false);
      setEditingPlan(null);
      resetForm();
      fetchPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save investment plan",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      min_amount: plan.min_amount.toString(),
      weekly_profit_percent: plan.weekly_profit_percent.toString(),
      duration_weeks: plan.duration_weeks?.toString() || '',
      is_active: plan.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this investment plan? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('investment_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Investment plan deleted successfully",
      });

      fetchPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete investment plan",
        variant: "destructive"
      });
    }
  };

  const togglePlanStatus = async (plan: InvestmentPlan) => {
    try {
      const { error } = await supabase
        .from('investment_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Plan ${!plan.is_active ? 'activated' : 'deactivated'} successfully`,
      });

      fetchPlans();
    } catch (error: any) {
      console.error('Error updating plan status:', error);
      toast({
        title: "Error",
        description: "Failed to update plan status",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      plan_name: '',
      min_amount: '',
      weekly_profit_percent: '',
      duration_weeks: '',
      is_active: true
    });
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    resetForm();
    setShowDialog(true);
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'bronze':
        return 'text-amber-600';
      case 'silver':
        return 'text-gray-600';
      case 'gold':
        return 'text-yellow-600';
      case 'diamond':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/2 sm:w-1/4"></div>
          <div className="h-8 sm:h-10 bg-gray-700 rounded w-full"></div>
          <div className="h-48 sm:h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Investment Plans Management</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Manage investment plans and their settings</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={fetchPlans}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
            size="sm"
          >
            Refresh Data
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Plan
          </Button>
        </div>
      </div>

      {/* Plans Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-lg sm:text-xl">Investment Plans</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Plan Name</TableHead>
                  <TableHead className="text-gray-300">Min Amount</TableHead>
                  <TableHead className="text-gray-300">Weekly Profit</TableHead>
                  <TableHead className="text-gray-300">Duration</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                      No investment plans found
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id} className="border-gray-700">
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`font-medium text-white ${getPlanColor(plan.plan_name)}`}>
                            {plan.plan_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                          {InvestmentService.formatCurrency(plan.min_amount)}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                          {plan.weekly_profit_percent}%
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          {plan.duration_weeks ? `${plan.duration_weeks} weeks` : 'Unlimited'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={plan.is_active}
                            onCheckedChange={() => togglePlanStatus(plan)}
                          />
                          <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(plan)}
                            className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(plan.id)}
                            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg sm:text-xl">
              {editingPlan ? 'Edit Investment Plan' : 'Create New Investment Plan'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plan_name" className="text-gray-300">Plan Name</Label>
              <Input
                id="plan_name"
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                placeholder="e.g., Bronze, Silver, Gold"
                className="mt-2 bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="min_amount" className="text-gray-300">Minimum Amount (USD)</Label>
              <Input
                id="min_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.min_amount}
                onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                placeholder="200"
                className="mt-2 bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="weekly_profit_percent" className="text-gray-300">Weekly Profit Percentage</Label>
              <Input
                id="weekly_profit_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.weekly_profit_percent}
                onChange={(e) => setFormData({ ...formData, weekly_profit_percent: e.target.value })}
                placeholder="10.00"
                className="mt-2 bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="duration_weeks" className="text-gray-300">Duration (weeks) - Leave empty for unlimited</Label>
              <Input
                id="duration_weeks"
                type="number"
                min="1"
                value={formData.duration_weeks}
                onChange={(e) => setFormData({ ...formData, duration_weeks: e.target.value })}
                placeholder="Leave empty for unlimited"
                className="mt-2 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="text-gray-300">Active Plan</Label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                size="sm"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvestmentPlans;
