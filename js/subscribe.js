export async function onRequestPost({ request, env }) {
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
        "Authorization": `Bearer ${env.MAILERLITE_API_KEY}`
      },
      body: JSON.stringify({
        email,
        groups: [env.MAILERLITE_GROUP_ID]
      })
    });

    if (!mailerliteResponse.ok) {
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