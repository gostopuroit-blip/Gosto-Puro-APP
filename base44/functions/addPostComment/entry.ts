import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { post_id, content } = await req.json();
  if (!post_id || !content?.trim()) return Response.json({ error: 'post_id and content required' }, { status: 400 });

  const comment = await base44.asServiceRole.entities.CommunityComment.create({
    post_id,
    user_email: user.email,
    user_name: user.full_name || user.email?.split("@")[0],
    user_photo: user.photo_url || null,
    content: content.trim(),
    is_expert: user.role === "expert" || user.role === "admin",
  });

  // Update comment count
  const posts = await base44.asServiceRole.entities.CommunityPost.filter({ id: post_id }, "-created_date", 1);
  const post = posts[0];
  if (post) {
    await base44.asServiceRole.entities.CommunityPost.update(post_id, {
      comments_count: (post.comments_count || 0) + 1,
    });
  }

  return Response.json({ comment, comments_count: (post?.comments_count || 0) + 1 });
});