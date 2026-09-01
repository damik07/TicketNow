// consulta de errores en el pago de MP

const accessToken = "TEST-5476660783066351-082809-9acfbdf10c8ab523a6f8e8ca5b04529b-3575896396"; //token de prueba del vendedor
const paymentId = "43970328477";

async function getPaymentDetail() {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    console.dir(data, { depth: null, colors: true });
  } catch (error) {
    console.error("Error al consultar:", error);
  }
}

getPaymentDetail();