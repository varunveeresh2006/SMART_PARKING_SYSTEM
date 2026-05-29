import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';

import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import MoneyIcon from '@mui/icons-material/Money';
import { supabase } from '../lib/supabase';
import type { Payment } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI Payment', icon: <PhoneAndroidIcon /> },
  { value: 'card', label: 'Credit/Debit Card', icon: <CreditCardIcon /> },
  { value: 'cash', label: 'Cash at Kiosk', icon: <MoneyIcon /> },
  { value: 'online', label: 'Net Banking', icon: <PaymentIcon /> },
];

export default function PaymentPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState('upi');
  const [successDialog, setSuccessDialog] = useState<Payment | null>(null);
  const [receiptDialog, setReceiptDialog] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payments')
      .select(`*, bookings(*, parking_slots(*, parking_floors(*)))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPayments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [user]);

  const handlePay = async (payment: Payment) => {
    setPaying(payment.id);
    await new Promise(r => setTimeout(r, 1500));
    const txnId = `TXN${Date.now()}`;
    await supabase.from('payments').update({
      payment_status: 'completed',
      payment_method: payMethod,
      transaction_id: txnId,
      paid_at: new Date().toISOString(),
    }).eq('id', payment.id);

    // Mark penalties as paid
    await supabase.from('penalties').update({ is_paid: true }).eq('booking_id', payment.booking_id);

    await supabase.from('notifications').insert({
      user_id: user!.id,
      booking_id: payment.booking_id,
      title: 'Payment Successful',
      message: `Payment of ₹${payment.total_amount} received. Transaction ID: ${txnId}`,
      type: 'success',
      is_read: false,
    });

    await fetchPayments();
    const updated = { ...payment, payment_status: 'completed' as const, transaction_id: txnId, paid_at: new Date().toISOString() };
    setSuccessDialog(updated);
    setPaying(null);
  };

  const pendingPayments = payments.filter(p => p.payment_status === 'pending');
  const completedPayments = payments.filter(p => p.payment_status === 'completed');
  const totalPending = pendingPayments.reduce((s, p) => s + p.total_amount, 0);
  const totalPaid = completedPayments.reduce((s, p) => s + p.total_amount, 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
        Payments
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Manage parking payment dues and view history
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                Pending
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', my: 0.5 }}>
                {loading ? <Skeleton width={80} /> : `₹${totalPending.toFixed(0)}`}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {pendingPayments.length} payment(s) due
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Paid
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', my: 0.5 }}>
                {loading ? <Skeleton width={80} /> : `₹${totalPaid.toFixed(0)}`}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {completedPayments.length} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                Payment Method
              </Typography>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => (
                    <MenuItem key={m.value} value={m.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {m.icon}
                        <Typography variant="body2">{m.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Payments */}
      {!loading && pendingPayments.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'warning.main' }}>
            <WarningAmberIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
            Pending Payments ({pendingPayments.length})
          </Typography>
          {pendingPayments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              pending
              paying={paying === p.id}
              onPay={() => handlePay(p)}
              onReceipt={() => setReceiptDialog(p)}
            />
          ))}
        </>
      )}

      {/* Payment History */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, mt: 3, color: 'text.primary' }}>
        <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
        Payment History
      </Typography>
      {loading ? (
        [...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 2 }} />)
      ) : completedPayments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.3 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>No payment history yet</Typography>
          </CardContent>
        </Card>
      ) : (
        completedPayments.map((p) => (
          <PaymentCard
            key={p.id}
            payment={p}
            pending={false}
            paying={false}
            onPay={() => {}}
            onReceipt={() => setReceiptDialog(p)}
          />
        ))
      )}

      {/* Success Dialog */}
      <Dialog open={!!successDialog} onClose={() => setSuccessDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Payment Successful!</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            ₹{successDialog?.total_amount} paid successfully
          </Typography>
          {successDialog?.transaction_id && (
            <Chip label={`Txn: ${successDialog.transaction_id}`} size="small" sx={{ bgcolor: 'rgba(46,125,50,0.2)', color: '#4caf50' }} />
          )}
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={() => { setSuccessDialog(null); }} fullWidth>Done</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptDialog} onClose={() => setReceiptDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
          Parking Receipt
        </DialogTitle>
        <DialogContent>
          {receiptDialog && (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(100,181,246,0.1)' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', mb: 2, fontWeight: 700, letterSpacing: 2 }}>
                ORION MALL PARKING — WHITEFIELD
              </Typography>
              {receiptDialog.transaction_id && (
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Chip label={receiptDialog.transaction_id} size="small" sx={{ bgcolor: 'rgba(21,101,192,0.2)', color: 'primary.light' }} />
                </Box>
              )}
              <Divider sx={{ mb: 2 }} />
              {[
                { label: 'Vehicle', val: (receiptDialog as { bookings?: { vehicle_number?: string } }).bookings?.vehicle_number },
                { label: 'Date', val: format(new Date(receiptDialog.created_at), 'dd/MM/yyyy hh:mm a') },
                { label: 'Base Amount', val: `₹${receiptDialog.base_amount}` },
                { label: 'Extra Time', val: `₹${receiptDialog.extra_time_amount}` },
                { label: 'Penalty', val: `₹${receiptDialog.penalty_amount}` },
              ].map(item => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.val}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Total Paid</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>₹{receiptDialog.total_amount}</Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center' }}>
                Thank you for parking at Orion Mall!
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function PaymentCard({ payment, pending, paying, onPay, onReceipt }: {
  payment: Payment;
  pending: boolean;
  paying: boolean;
  onPay: () => void;
  onReceipt: () => void;
}) {
  const booking = (payment as { bookings?: { vehicle_number?: string; parking_slots?: { slot_number?: string; parking_floors?: { floor_name?: string } } } }).bookings;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <DirectionsCarIcon sx={{ fontSize: 18, color: 'primary.light' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {booking?.vehicle_number ?? 'Vehicle'}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {booking?.parking_slots?.parking_floors?.floor_name ?? ''} — Slot {booking?.parking_slots?.slot_number ?? ''}
            </Typography>
          </Box>
          <Chip
            label={pending ? 'PENDING' : 'PAID'}
            size="small"
            sx={{
              bgcolor: pending ? 'rgba(230,81,0,0.2)' : 'rgba(46,125,50,0.2)',
              color: pending ? 'warning.main' : 'success.main',
              fontWeight: 700,
            }}
          />
        </Box>

        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[
            { label: 'Base Amount', val: `₹${payment.base_amount}` },
            { label: 'Extra Time', val: `₹${payment.extra_time_amount}`, warn: payment.extra_time_amount > 0 },
            { label: 'Penalty', val: `₹${payment.penalty_amount}`, error: payment.penalty_amount > 0 },
            { label: 'Total', val: `₹${payment.total_amount}`, bold: true },
          ].map(item => (
            <Grid size={3} key={item.label}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{item.label}</Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: item.bold ? 700 : 600,
                  color: item.error ? 'error.main' : item.warn ? 'warning.main' : item.bold ? 'success.main' : 'text.primary',
                }}
              >
                {item.val}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {pending && (
            <Button
              variant="contained" size="small" onClick={onPay}
              disabled={paying}
              startIcon={paying ? <CircularProgress size={14} color="inherit" /> : <PaymentIcon />}
            >
              {paying ? 'Processing...' : `Pay ₹${payment.total_amount}`}
            </Button>
          )}
          <Button
            variant="outlined" size="small" onClick={onReceipt}
            startIcon={<ReceiptIcon />}
            sx={{ borderColor: 'rgba(100,181,246,0.3)' }}
          >
            Receipt
          </Button>
          {!pending && payment.paid_at && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {format(new Date(payment.paid_at), 'dd/MM/yy hh:mm a')}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
