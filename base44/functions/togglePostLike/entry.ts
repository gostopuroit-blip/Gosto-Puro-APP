import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { post_id } = await req.json();
  if (!post_id) return Response.json({ error: 'post_id required' }, { status: 400 });

  const posts = await base44.asServiceRole.entities.CommunityPost.filter({ id: post_id }, "-created_date", 1);
  const post = posts[0];
  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

  const likes = post.likes || [];
  const isLiked = likes.includes(user.email);
  const newLikes = isLiked
    ? likes.filter((e) => e !== user.email)
    : [...likes, user.email];

  await base44.asServiceRole.entities.CommunityPost.update(post_id, {
    likes: newLikes,
    likes_count: newLikes.length,
  });

  return Response.json({ likes: newLikes, likes_count: newLikes.length, isLiked: !isLiked });
});