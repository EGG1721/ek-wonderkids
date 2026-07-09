export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Ruta dinámica: captura de suscriptores hacia MailerLite
    if (url.pathname === "/subscribe" && request.method === "POST") {
      return handleSubscribe(request, env);
    }

    // Todo lo demás (HTML, CSS, JS, imágenes) lo sirve el binding de assets
    return env.ASSETS.fetch(request);
  }
};

async function handleSubscribe(request, env) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return Response.json(
        { message: "Please enter a valid email." },
        { status: 400 }
      );
    }

    const mailerliteResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${env.MAILERLITE_API_KEY}`
      },
      body: JSON.stringify({
        email,
        groups: [env.MAILERLITE_GROUP_ID]
      })
    });

    if (!mailerliteResponse.ok) {
      const errorDetail = await mailerliteResponse.text();
      return Response.json(
        { message: "DEBUG: " + mailerliteResponse.status + " - " + errorDetail },
        { status: 500 }
      );
    }

    return Response.json(
      { message: "Subscribed successfully." },
      { status: 200 }
    );

  } catch (error) {
    return Response.json(
      { message: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}