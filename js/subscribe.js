export async function onRequestPost({ request, env }) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return Response.json(
        { message: "Please enter a valid email." },
        { status: 400 }
      );
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.BREVO_API_KEY
      },
      body: JSON.stringify({
        email,
        listIds: [Number(env.BREVO_LIST_ID)],
        updateEnabled: true
      })
    });

    if (!brevoResponse.ok) {
      return Response.json(
        { message: "We could not save your email right now." },
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