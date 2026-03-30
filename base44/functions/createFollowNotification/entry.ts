import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { followed_email, follower_email, follower_name, follower_photo } = await req.json();

    if (!followed_email || !follower_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Don't send notification if user followed themselves
    if (follower_email === followed_email) {
      return Response.json({ success: true, skipped: true });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: followed_email,
      sender_email: follower_email,
      sender_name: follower_name || follower_email.split('@')[0],
      sender_photo: follower_photo || null,
      type: 'follow',
      message: `${follower_name || follower_email.split('@')[0]} ha iniziato a seguirti`,
      reference_id: follower_email,
      reference_type: 'profile',
      is_read: false,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});