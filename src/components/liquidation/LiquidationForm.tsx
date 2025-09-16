import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/supabase';
import { Tables } from '../../types/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

type LiquidationRequest = Tables<'liquidation_requests'>;
type LiquidationItem = Tables<'liquidation_items'>;

interface LiquidationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRequest?: LiquidationRequest | null;
  userId?: string;
}

interface FormItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  unit_price: number;
  category: string;
  receipt_url?: string;
}

export default function LiquidationForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingRequest = null,
  userId 
}: LiquidationFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    currency: 'USD',
    notes: '',
    tags: [] as string[]
  });
  
  const [items, setItems] = useState<FormItem[]>([
    {
      id: '1',
      description: '',
      amount: 0,
      quantity: 1,
      unit_price: 0,
      category: ''
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [uploadingReceipts, setUploadingReceipts] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  // Load existing data when editing
  useEffect(() => {
    if (editingRequest) {
      setFormData({
        title: editingRequest.title,
        description: editingRequest.description || '',
        category: editingRequest.category || '',
        currency: editingRequest.currency || 'USD',
        notes: editingRequest.notes || '',
        tags: editingRequest.tags || []
      });
      
      // Load existing items
      fetchExistingItems();
    } else {
      // Reset form for new request
      setFormData({
        title: '',
        description: '',
        category: '',
        currency: 'USD',
        notes: '',
        tags: []
      });
      setItems([{
        id: '1',
        description: '',
        amount: 0,
        quantity: 1,
        unit_price: 0,
        category: ''
      }]);
    }
  }, [editingRequest, isOpen]);

  const fetchExistingItems = async () => {
    if (!editingRequest) return;
    
    try {
      const { data, error } = await supabase
        .from('liquidation_items')
        .select('*')
        .eq('liquidation_id', editingRequest.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedItems = data.map((item, index) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.amount,
          category: item.category || '',
          receipt_url: item.receipt_url || undefined
        }));
        setItems(formattedItems);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const addItem = () => {
    const newItem: FormItem = {
      id: Date.now().toString(),
      description: '',
      amount: 0,
      quantity: 1,
      unit_price: 0,
      category: ''
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate amount when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.amount = updatedItem.quantity * updatedItem.unit_price;
        }
        // Auto-calculate unit_price when amount or quantity changes
        else if (field === 'amount' && updatedItem.quantity > 0) {
          updatedItem.unit_price = updatedItem.amount / updatedItem.quantity;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.amount || 0), 0);
  };

  // File upload for receipts
  const uploadReceipt = async (file: File, itemId: string) => {
    setUploadingReceipts(prev => ({ ...prev, [itemId]: true }));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      updateItem(itemId, 'receipt_url', publicUrl);
      
      toast({
        title: "Success",
        description: "Receipt uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive"
      });
    } finally {
      setUploadingReceipts(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const createReceiptDropzone = (itemId: string) => {
    const onDrop = (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        uploadReceipt(acceptedFiles[0], itemId);
      }
    };

    return useDropzone({
      onDrop,
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
        'application/pdf': ['.pdf']
      },
      multiple: false,
      maxSize: 5 * 1024 * 1024 // 5MB
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      
      if (items.length === 0 || items.every(item => !item.description.trim())) {
        throw new Error('At least one item is required');
      }

      const totalAmount = calculateTotal();
      
      const requestData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        currency: formData.currency,
        notes: formData.notes,
        tags: formData.tags,
        total_amount: totalAmount,
        user_id: userId
      };

      let requestId: string;

      if (editingRequest) {
        // Update existing request
        const { error } = await supabase
          .from('liquidation_requests')
          .update(requestData)
          .eq('id', editingRequest.id);
        
        if (error) throw error;
        requestId = editingRequest.id;
        
        // Delete existing items
        await supabase
          .from('liquidation_items')
          .delete()
          .eq('liquidation_id', requestId);
      } else {
        // Create new request
        const { data, error } = await supabase
          .from('liquidation_requests')
          .insert(requestData)
          .select()
          .single();
        
        if (error) throw error;
        requestId = data.id;
      }

      // Insert items
      const itemsData = items
        .filter(item => item.description.trim())
        .map(item => ({
          liquidation_id: requestId,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity,
          unit_price: item.unit_price,
          category: item.category,
          receipt_url: item.receipt_url
        }));

      if (itemsData.length > 0) {
        const { error: itemsError } = await supabase
          .from('liquidation_items')
          .insert(itemsData);
        
        if (itemsError) throw itemsError;
      }

      toast({
        title: "Success",
        description: editingRequest ? "Request updated successfully" : "Request created successfully"
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRequest ? 'Edit Liquidation Request' : 'New Liquidation Request'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter request title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="meals">Meals</SelectItem>
                      <SelectItem value="office">Office Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this request"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Total Amount</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {formData.currency} {calculateTotal().toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => {
                const dropzone = createReceiptDropzone(item.id);
                
                return (
                  <div key={item.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <Label>Description *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Category</Label>
                        <Select 
                          value={item.category} 
                          onValueChange={(value) => updateItem(item.id, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="meals">Meals</SelectItem>
                            <SelectItem value="office">Office Supplies</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label>Total Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Receipt Upload */}
                    <div>
                      <Label>Receipt</Label>
                      {item.receipt_url ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                          <span className="text-sm text-green-700">Receipt uploaded</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => updateItem(item.id, 'receipt_url', undefined)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          {...dropzone.getRootProps()}
                          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                            dropzone.isDragActive
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input {...dropzone.getInputProps()} />
                          {uploadingReceipts[item.id] ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-sm">Uploading...</span>
                            </div>
                          ) : (
                            <div>
                              <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600">
                                Drop receipt here or click to upload
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                PNG, JPG, PDF up to 5MB
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes or comments"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editingRequest ? 'Update Request' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}