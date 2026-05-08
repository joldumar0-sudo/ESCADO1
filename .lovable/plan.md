## O que vai ser adicionado ao Painel de Admin

O painel atual já permite **nomear membros** (admin/dirigente/jovem/membro) e **mudar secção**. Vou estruturá-lo em **abas** e adicionar o que falta.

### Novas abas no `/app/admin`

1. **Membros** (já existe — mantém pesquisa, filtros, papéis, secção)
2. **Atividades** — criar/editar/eliminar atividades (reuniões, acampamentos, saídas)
   - Campos: título, data, local, secção(ões), descrição
3. **Presenças** — para cada atividade, marcar quem participou
   - Lista de membros com checkbox "presente / ausente / justificado"
   - Resumo: nº de presentes / total
4. **Conteúdo** — atalhos para gerir e **eliminar**:
   - Documentos (Biblioteca)
   - Fotos (Galeria)
   - Mensagens do chat geral
   (admin pode apagar qualquer item; dirigente apenas o que criou)

### Base de dados (novas tabelas)

- `activities` — id, title, description, location, starts_at, ends_at, sections[], created_by
- `activity_attendance` — id, activity_id, user_id, status (`presente`|`ausente`|`justificado`), notes
- RLS:
  - Atividades: leitura para todos os autenticados; criar/editar/apagar só para staff (admin/dirigente)
  - Presenças: leitura para todos; escrita só para staff
- Permitir admin apagar **qualquer** documento/foto/chat (já permitido para chat; alargar para documents/gallery onde só staff que carregou pode apagar — admin sempre pode)

### Ficheiros que vão mudar

- `supabase/migrations/<novo>.sql` — tabelas + RLS + políticas alargadas para admin apagar tudo
- `src/routes/app.admin.tsx` — refactor com Tabs (Membros / Atividades / Presenças / Conteúdo)
- Novos componentes em `src/components/admin/`:
  - `MembersTab.tsx` (extrai conteúdo atual)
  - `ActivitiesTab.tsx` (CRUD atividades)
  - `AttendanceTab.tsx` (escolher atividade → marcar presenças)
  - `ContentTab.tsx` (listar e apagar docs/fotos/chats)

Posso avançar?