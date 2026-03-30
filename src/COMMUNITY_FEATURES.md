# 🍳 Guia de Funcionalidades - Aba Comunidade

## ✅ STATUS DE IMPLEMENTAÇÃO

### 1. **FEED** ✅
- ✅ Stories em círculos no topo (StoriesBar.jsx)
- ✅ Abas "Scopri" e "Seguiti" com contadores
- ✅ Hashtags trending em carrossel (TrendingHashtags.jsx)
- ✅ Posts com botão Seguir direto no card (FollowButton integrado)
- ✅ Post fixado (is_pinned=true) aparece primeiro com ícone 📌
- ✅ Seção "Quem Seguir?" com usuários is_suggested=true

### 2. **CARD DO POST** ✅
- ✅ Reações (❤️😂😮😢👏🔥) ao segurar o coração (ReactionButton.jsx - long press)
- ✅ Contador de reações por tipo
- ✅ Botão de repost 🔁 com contador (RepostModal.jsx)
- ✅ Menu 3 pontinhos (PostActionsMenu.jsx) com:
  - ✅ Reportar (Flag)
  - ✅ Compartilhar (Facebook, WhatsApp, copiar link)
  - ✅ Repostar 🔁
  - ✅ Editar/Excluir (só dono)

### 3. **COMENTÁRIOS** ✅
- ✅ Campo de comentário fixo no rodapé do card
- ✅ Scroll correto (max-h-80 overflow-y-auto)
- ✅ Reportar comentário (via delete)
- ✅ Curtir comentário (likes array)
- ⏳ Reply com @menção (estrutura pronta, falta UI)

### 4. **PUBLICAR POST** ✅
- ✅ Múltiplas imagens (até 5) (NewPostModal.jsx)
- ✅ Campo de hashtags com sugestões
- ✅ Opção de enquete embutida (PollCard.jsx)
- ✅ Seleção do tipo de post
- ✅ Prévia das imagens

### 5. **ENQUETES NO FEED** ✅
- ✅ Opções votáveis direto no card (PollCard.jsx)
- ✅ Barra de progresso após votar
- ✅ Total de votos
- ✅ Enquete encerrada quando expirada

### 6. **BUSCA** ✅
- ✅ Lupa no topo (Search.jsx)
- ✅ Busca em tempo real com debounce
- ✅ Abas Posts/Usuários/Hashtags
- ✅ Trending hashtags quando vazio

### 7. **NOTIFICAÇÕES** ✅
- ✅ Sino no topo com badge de não lidas (NotificationBell.jsx)
- ✅ Painel com lista
- ✅ Marcar como lida

### 8. **PERFIL** ✅
- ✅ Contagem de seguidores/seguindo (ExpertProfile.jsx)
- ✅ Botão editar perfil com campos:
  - ✅ Foto
  - ✅ Nome
  - ✅ Bio (150 chars) (EditProfileModal.jsx)
  - ✅ Restrições alimentares
  - ✅ Modo escuro

### 9. **HASHTAG** ✅
- ✅ Clique na hashtag abre página (HashtagPage.jsx)
- ✅ Grid de posts em 2 colunas (mobile: 1 coluna)

---

## 📂 ESTRUTURA DE ARQUIVOS

```
components/community/
├── CommunityPostCard.jsx       # Card principal do post
├── RepostCard.jsx              # Card de repost (com indicador)
├── PostActionsMenu.jsx         # Menu 3 pontinhos
├── RepostModal.jsx             # Modal para repostar
├── ReactionButton.jsx          # Seletor de reações (long press)
├── PollCard.jsx                # Card de enquete
├── FollowButton.jsx            # Botão seguir inline
├── NotificationBell.jsx        # Sino de notificações
├── TrendingHashtags.jsx        # Carrossel de hashtags trending
├── StoriesBar.jsx              # Stories em círculos
├── SuggestedUsers.jsx          # Sugestões de usuários
├── PostDetailModal.jsx         # Modal detalhes do post
├── PostTypeFilter.jsx          # Filtro de tipos de post
├── NewPostModal.jsx            # Modal para criar post
└── CommentItem.jsx             # Item de comentário

pages/
├── Community.jsx               # Feed principal
├── Search.jsx                  # Página de busca
├── ExpertProfile.jsx           # Perfil do usuário (feed + grid)
├── HashtagPage.jsx             # Página de hashtag

functions/
├── createLikeNotification.js
├── createCommentNotification.js
├── createFollowNotification.js
├── createRepostNotification.js
```

---

## 🔧 PRINCIPAIS COMPONENTES

### ReactionButton.jsx
- Long press (500ms) abre modal de reações
- 6 emojis: ❤️😂😮😢👏🔥
- Contador por reação
- Remove reação se clicar novamente
- Entidade: `PostReaction`

### RepostModal.jsx
- Prévia do post original
- Campo de legenda (max 300 chars)
- Cria `PostShare` com `share_type="repost"`
- Cria notificação para autor original

### RepostCard.jsx
- Mostra indicador "🔁 Fulano repostou"
- Exibe legenda do reposter
- Embute o `CommunityPostCard` do post original

### PostActionsMenu.jsx
- Menu dropdown com ações
- Share (Facebook, WhatsApp, copiar link)
- Repostar (abre RepostModal)
- Reportar (ReportModal)
- Editar/Excluir (só dono)
- Bloquear usuário (não dono)

---

## 📊 ENTIDADES

- `CommunityPost` - Posts (+ is_pinned, is_premium, is_expert)
- `CommunityComment` - Comentários com curtidas
- `Poll` - Enquetes vinculadas a posts
- `PostReaction` - Reações emoji por post
- `PostShare` - Reposts (share_type="repost")
- `Notification` - Notificações
- `User` - Usuários (+ is_suggested, dark_mode, bio, dietary_restrictions)
- `UserFollow` - Seguir usuários
- `UserBlock` - Bloquear usuários
- `Hashtag` - Hashtags com contadores
- `Story` - Stories (24h expiration)
- `DirectMessage` - Mensagens diretas

---

## 🎯 PRÓXIMOS PASSOS (OPCIONAIS)

1. **Replies com @menção** - UI para reply_to_comment_id
2. **Mention de usuários** - Campo com autocomplete de @users
3. **DM (Direct Messages)** - Chat privado entre usuários
4. **Story Shares** - Compartilhar post para story
5. **Links Pré-visualização** - Embed de URLs
6. **Moderação de Comentários** - Rejection/approval

---

## 🚀 COMO USAR

### Criar Post
1. Clique no botão "Post" ou "Cosa stai cucinando?"
2. Adicione imagens (até 5)
3. Escreva conteúdo
4. Adicione hashtags
5. Escolha tipo de post (image_post, tip, recipe, premium_content)
6. Opcionalmente crie enquete
7. Poste!

### Repostar
1. Clique no menu 3 pontinhos do post
2. Selecione "🔁 Repostare"
3. Adicione legenda (opcional)
4. Confirme

### Reagir
1. Clique no coração e segure (500ms)
2. Escolha emoji
3. Clique novamente para remover

### Buscar
1. Clique na lupa no topo
2. Digite query
3. Veja resultados em abas: Posts / Usuários / Hashtags

### Notificações
1. Clique no sino no topo
2. Veja lista de notificações
3. Clique para ver detalhes (auto marca como lida)