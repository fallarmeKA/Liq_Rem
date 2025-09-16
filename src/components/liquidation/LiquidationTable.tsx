import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabase/supabase';
import { Tables } from '../../types/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useToast } from '../ui/use-toast';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Calendar,
  DollarSign,
  User,
  CheckSquare,
  Square
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';

type LiquidationRequest = Tables<'liquidation_requests'>;
type LiquidationItem = Tables<'liquidation_items'>;

interface LiquidationWithItems extends LiquidationRequest {
  liquidation_items: LiquidationItem[];
  user_profiles?: {
    full_name: string;
    email: string;
  };
}

interface LiquidationTableProps {
  userRole?: 'user' | 'admin' | 'approver';
  userId?: string;
}

export default function LiquidationTable({ userRole = 'user', userId }: LiquidationTableProps) {
  const [liquidations, setLiquidations] = useState<LiquidationWithItems[]>([]);
  const [filteredLiquidations, setFilteredLiquidations] = useState<LiquidationWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('submitted_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLiquidation, setSelectedLiquidation] = useState<LiquidationWithItems | null>(null);
  
  const { toast } = useToast();

  // Fetch liquidations
  const fetchLiquidations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('liquidation_requests')
        .select(`
          *,
          liquidation_items(*),
          user_profiles(full_name, email)
        `);

      // If user role, only show their own requests
      if (userRole === 'user' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('submitted_date', { ascending: false });

      if (error) throw error;
      setLiquidations(data || []);
    } catch (error) {
      console.error('Error fetching liquidations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch liquidation requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidations();
  }, [userRole, userId]);

  // Filter and sort liquidations
  useEffect(() => {
    let filtered = [...liquidations];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(item => 
          new Date(item.submitted_date || '') >= filterDate
        );
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof LiquidationRequest];
      let bValue: any = b[sortBy as keyof LiquidationRequest];

      if (sortBy === 'user_name') {
        aValue = a.user_profiles?.full_name || '';
        bValue = b.user_profiles?.full_name || '';
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLiquidations(filtered);
  }, [liquidations, searchTerm, statusFilter, categoryFilter, dateFilter, sortBy, sortOrder]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = liquidations.map(item => item.category).filter(Boolean);
    return [...new Set(cats)];
  }, [liquidations]);

  // Inline editing functions
  const startEditing = (id: string, field: string, currentValue: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditingValue(currentValue || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editingField) return;

    try {
      const updateData: any = {};
      updateData[editingField] = editingValue;

      const { error } = await supabase
        .from('liquidation_requests')
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Updated successfully"
      });

      fetchLiquidations();
      setEditingId(null);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: "Error",
        description: "Failed to update",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditingValue('');
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedItems.length === filteredLiquidations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredLiquidations.map(item => item.id));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedItems.length === 0) return;

    try {
      const { error } = await supabase
        .from('liquidation_requests')
        .update({ status })
        .in('id', selectedItems);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedItems.length} items to ${status}`
      });

      setSelectedItems([]);
      fetchLiquidations();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast({
        title: "Error",
        description: "Failed to update items",
        variant: "destructive"
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      const { error } = await supabase
        .from('liquidation_requests')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedItems.length} items`
      });

      setSelectedItems([]);
      fetchLiquidations();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive"
      });
    }
  };

  // Excel export
  const exportToExcel = () => {
    const exportData = filteredLiquidations.map(item => ({
      'Request ID': item.id,
      'Title': item.title,
      'Description': item.description,
      'Amount': item.total_amount,
      'Currency': item.currency,
      'Status': item.status,
      'Category': item.category,
      'Submitted Date': new Date(item.submitted_date || '').toLocaleDateString(),
      'Approved Date': item.approved_date ? new Date(item.approved_date).toLocaleDateString() : '',
      'Requester': item.user_profiles?.full_name || '',
      'Email': item.user_profiles?.email || '',
      'Notes': item.notes,
      'Items Count': item.liquidation_items?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Liquidations');
    XLSX.writeFile(wb, `liquidations_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Success",
      description: "Excel file downloaded successfully"
    });
  };

  // Excel import
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Process and insert data
      for (const row of jsonData as any[]) {
        const liquidationData = {
          title: row['Title'] || 'Imported Request',
          description: row['Description'] || '',
          total_amount: parseFloat(row['Amount']) || 0,
          currency: row['Currency'] || 'USD',
          status: row['Status'] || 'pending',
          category: row['Category'] || '',
          user_id: userId // Assign to current user
        };

        await supabase.from('liquidation_requests').insert(liquidationData);
      }

      toast({
        title: "Success",
        description: `Imported ${jsonData.length} records successfully`
      });

      fetchLiquidations();
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: "Error",
        description: "Failed to import Excel file",
        variant: "destructive"
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'processing': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Liquidation Requests</h2>
          <p className="text-gray-600">Manage and track all liquidation requests</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Request
          </Button>
          
          <Button variant="outline" onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          
          <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_date-desc">Date (Newest)</SelectItem>
                <SelectItem value="submitted_date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="total_amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="total_amount-asc">Amount (Low to High)</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                <SelectItem value="status-asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedItems.length} item(s) selected
              </span>
              <div className="flex gap-2">
                {userRole !== 'user' && (
                  <>
                    <Button size="sm" onClick={() => bulkUpdateStatus('approved')}>
                      Approve Selected
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('rejected')}>
                      Reject Selected
                    </Button>
                  </>
                )}
                <Button size="sm" variant="destructive" onClick={bulkDelete}>
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedItems.length === filteredLiquidations.length && filteredLiquidations.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left font-medium text-gray-900">Title</th>
                  <th className="p-4 text-left font-medium text-gray-900">Amount</th>
                  <th className="p-4 text-left font-medium text-gray-900">Status</th>
                  <th className="p-4 text-left font-medium text-gray-900">Category</th>
                  <th className="p-4 text-left font-medium text-gray-900">Submitted</th>
                  {userRole !== 'user' && (
                    <th className="p-4 text-left font-medium text-gray-900">Requester</th>
                  )}
                  <th className="p-4 text-left font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLiquidations.map((liquidation) => (
                  <tr key={liquidation.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedItems.includes(liquidation.id)}
                        onCheckedChange={() => handleSelectItem(liquidation.id)}
                      />
                    </td>
                    
                    <td className="p-4">
                      {editingId === liquidation.id && editingField === 'title' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => startEditing(liquidation.id, 'title', liquidation.title)}
                        >
                          <div className="font-medium">{liquidation.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {liquidation.description}
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4">
                      {editingId === liquidation.id && editingField === 'total_amount' ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-8 w-24"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => startEditing(liquidation.id, 'total_amount', liquidation.total_amount.toString())}
                        >
                          <div className="font-medium">
                            {liquidation.currency} {liquidation.total_amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {liquidation.liquidation_items?.length || 0} items
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4">
                      {editingId === liquidation.id && editingField === 'status' && userRole !== 'user' ? (
                        <div className="flex gap-2">
                          <Select value={editingValue} onValueChange={setEditingValue}>
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <Badge
                          variant={getStatusBadgeVariant(liquidation.status || 'pending')}
                          className={`cursor-pointer ${userRole !== 'user' ? 'hover:opacity-80' : ''}`}
                          onClick={() => userRole !== 'user' && startEditing(liquidation.id, 'status', liquidation.status || 'pending')}
                        >
                          {liquidation.status}
                        </Badge>
                      )}
                    </td>
                    
                    <td className="p-4">
                      {editingId === liquidation.id && editingField === 'category' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-8 w-32"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => startEditing(liquidation.id, 'category', liquidation.category || '')}
                        >
                          {liquidation.category || 'Uncategorized'}
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(liquidation.submitted_date || '').toLocaleDateString()}
                    </td>
                    
                    {userRole !== 'user' && (
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="font-medium">{liquidation.user_profiles?.full_name}</div>
                          <div className="text-gray-500">{liquidation.user_profiles?.email}</div>
                        </div>
                      </td>
                    )}
                    
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLiquidation(liquidation)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(liquidation.id, 'title', liquidation.title)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this request?')) {
                              try {
                                await supabase.from('liquidation_requests').delete().eq('id', liquidation.id);
                                toast({ title: "Success", description: "Request deleted successfully" });
                                fetchLiquidations();
                              } catch (error) {
                                toast({ title: "Error", description: "Failed to delete request", variant: "destructive" });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLiquidations.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first liquidation request'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && dateFilter === 'all' && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Request
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View Dialog */}
      {selectedLiquidation && (
        <Dialog open={!!selectedLiquidation} onOpenChange={() => setSelectedLiquidation(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Title</Label>
                  <p className="text-lg font-medium">{selectedLiquidation.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedLiquidation.status || 'pending')}>
                    {selectedLiquidation.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                  <p className="text-lg font-medium">
                    {selectedLiquidation.currency} {selectedLiquidation.total_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Category</Label>
                  <p>{selectedLiquidation.category || 'Uncategorized'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Submitted Date</Label>
                  <p>{new Date(selectedLiquidation.submitted_date || '').toLocaleDateString()}</p>
                </div>
                {selectedLiquidation.approved_date && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Approved Date</Label>
                    <p>{new Date(selectedLiquidation.approved_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              {selectedLiquidation.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="mt-1">{selectedLiquidation.description}</p>
                </div>
              )}
              
              {selectedLiquidation.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="mt-1">{selectedLiquidation.notes}</p>
                </div>
              )}
              
              {selectedLiquidation.liquidation_items && selectedLiquidation.liquidation_items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Items</Label>
                  <div className="mt-2 space-y-2">
                    {selectedLiquidation.liquidation_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${item.unit_price} = ${item.amount}
                          </p>
                        </div>
                        {item.receipt_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
                              View Receipt
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}