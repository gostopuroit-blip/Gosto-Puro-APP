import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_email, sender_name, post_id, type } = await req.json();

    if (!recipient_email || !sender_name || !post_id || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await base44.entities.Notification.create({
      recipient_email,
      sender_email: user.email,
      sender_name,
      type,
      message: type === 'post_mention' 
        ? `${sender_name} ti ha menzionato in un post`
        : `${sender_name} ti ha menzionato in un commento`,
      reference_id: post_id,
      is_read: false,
      status: 'active',
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating mention notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});