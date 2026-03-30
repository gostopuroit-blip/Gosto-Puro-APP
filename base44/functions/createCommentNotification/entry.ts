import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { post_id, post_author_email, comment_author_email, comment_author_name, comment_author_photo } = await req.json();

    if (!post_id || !post_author_email || !comment_author_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Don't send notification if user commented on their own post
    if (comment_author_email === post_author_email) {
      return Response.json({ success: true, skipped: true });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: post_author_email,
      sender_email: comment_author_email,
      sender_name: comment_author_name || comment_author_email.split('@')[0],
      sender_photo: comment_author_photo || null,
      type: 'comment',
      message: `${comment_author_name || comment_author_email.split('@')[0]} ha commentato il tuo post`,
      reference_id: post_id,
      reference_type: 'post',
      is_read: false,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});