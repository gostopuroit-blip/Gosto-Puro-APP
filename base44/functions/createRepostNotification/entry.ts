import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      post_id,
      post_author_email,
      reposter_email,
      reposter_name,
      reposter_photo,
    } = await req.json();

    if (!post_author_email || !reposter_email) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: post_author_email,
      sender_email: reposter_email,
      sender_name: reposter_name || reposter_email.split("@")[0],
      sender_photo: reposter_photo || null,
      type: "share",
      message: `${reposter_name || reposter_email.split("@")[0]} ha repostato il tuo post`,
      reference_id: post_id,
      reference_type: "post",
      is_read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error creating repost notification:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});