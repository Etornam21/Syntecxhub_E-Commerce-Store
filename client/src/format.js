const fmt = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' });
export const money = (n) => fmt.format(n || 0);
export const dateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const STATUS_LABEL = { pending: 'Awaiting payment', paid: 'Paid', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
export const PAYMENT_LABEL = { card: 'Card', momo: 'Mobile money', cod: 'Pay on delivery' };
export const REGIONS = ['Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Western North', 'Volta', 'Oti', 'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo'];
