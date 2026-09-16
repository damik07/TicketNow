const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
  headers: { Authorization: `Bearer ${organizerAccessToken}` }
});
const payment = await res.json();
console.log(payment.status, payment.status_detail);