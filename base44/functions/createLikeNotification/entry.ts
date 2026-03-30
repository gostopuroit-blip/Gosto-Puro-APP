import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { post_id, post_author_email, liker_email, liker_name, liker_photo } = await req.json();

    if (!post_id || !post_author_email || !liker_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Don't send notification if user liked their own post
    if (liker_email === post_author_email) {
      return Response.json({ success: true, skipped: true });
    }

    // Check if notification already exists for this like
    const existing = await base44.asServiceRole.entities.Notification.filter({
      recipient_email: post_author_email,
      sender_email: liker_email,
      type: 'like',
      reference_id: post_id,
    }, '-created_date', 1).catch(() => []);

    if (existing.length > 0) {
      return Response.json({ success: true, skipped: true, reason: 'Already exists' });
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: post_author_email,
      sender_email: liker_email,
      sender_name: liker_name || liker_email.split('@')[0],
      sender_photo: liker_photo || null,
      type: 'like',
      message: `${liker_name || liker_email.split('@')[0]} ha messo mi piace al tuo post`,
      reference_id: post_id,
      reference_type: 'post',
      is_read: false,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});