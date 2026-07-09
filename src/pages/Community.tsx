import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Send, 
  ThumbsUp, 
  MessageCircle, 
  Calendar, 
  Video, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  Heart
} from 'lucide-react';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    nama: string;
  };
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  anonymous: boolean;
  created_at: string;
  profiles?: {
    nama: string;
  };
  post_likes: { user_id: string }[];
  community_comments: Comment[];
}

interface Workshop {
  id: string;
  title: string;
  description: string;
  instructor: string;
  date: string;
  time: string;
  link: string;
  category: string;
  max_participants: number;
}

export default function Community() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'workshops'>('feed');

  // Feed states
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [postingLoading, setPostingLoading] = useState(false);
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentingLoading, setCommentingLoading] = useState<Record<string, boolean>>({});

  // Workshop states
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrations, setRegistrations] = useState<string[]>([]); // Array of workshop_ids
  const [workshopsLoading, setWorkshopsLoading] = useState(true);
  const [registeringMap, setRegisteringMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setCurrentUser(session.user);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'feed') {
        fetchFeed();
      } else {
        fetchWorkshops();
      }
    }
  }, [currentUser, activeTab]);

  // --- FETCH FEED ---
  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles(nama),
          post_likes(user_id),
          community_comments(
            id,
            post_id,
            user_id,
            content,
            created_at,
            profiles(nama)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort comments within posts by created_at ascending
      const sortedPosts = (data || []).map((post: any) => {
        if (post.community_comments) {
          post.community_comments.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        return post;
      });

      setPosts(sortedPosts);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  // --- CREATE POST ---
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || postingLoading) return;
    setPostingLoading(true);

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: currentUser.id,
          content: newPostContent.trim(),
          anonymous: isAnonymous
        });

      if (error) throw error;
      setNewPostContent('');
      await fetchFeed();
    } catch (err: any) {
      alert(`Gagal mengirim curhat: ${err.message}`);
    } finally {
      setPostingLoading(false);
    }
  };

  // --- DELETE POST ---
  const handleDeletePost = async (postId: string) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus postingan ini?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err: any) {
      alert(`Gagal menghapus postingan: ${err.message}`);
    }
  };

  // --- TOGGLE LIKE ---
  const handleToggleLike = async (post: Post) => {
    const hasLiked = post.post_likes.some(l => l.user_id === currentUser.id);
    
    // Optimistic state update
    const updatedLikes = hasLiked
      ? post.post_likes.filter(l => l.user_id !== currentUser.id)
      : [...post.post_likes, { user_id: currentUser.id }];
    
    setPosts(prevPosts => 
      prevPosts.map(p => p.id === post.id ? { ...p, post_likes: updatedLikes } : p)
    );

    try {
      if (hasLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id);
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: currentUser.id });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert state if error
      fetchFeed();
    }
  };

  // --- ADD COMMENT ---
  const handleAddComment = async (postId: string) => {
    const commentText = commentInputs[postId] || '';
    if (!commentText.trim() || commentingLoading[postId]) return;

    setCommentingLoading(prev => ({ ...prev, [postId]: true }));

    try {
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: commentText.trim()
        });

      if (error) throw error;
      
      // Clear input
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      
      // Refresh feed to show new comment
      await fetchFeed();
    } catch (err: any) {
      alert(`Gagal mengirim komentar: ${err.message}`);
    } finally {
      setCommentingLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  // --- DELETE COMMENT ---
  const handleDeleteComment = async (commentId: string) => {
    const confirmDelete = window.confirm('Hapus komentar ini?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await fetchFeed();
    } catch (err: any) {
      alert(`Gagal menghapus komentar: ${err.message}`);
    }
  };

  // --- FETCH WORKSHOPS ---
  const fetchWorkshops = async () => {
    setWorkshopsLoading(true);
    try {
      // 1. Fetch all workshops
      const { data: wsData, error: wsError } = await supabase
        .from('workshops')
        .select('*')
        .order('created_at', { ascending: true });

      if (wsError) throw wsError;
      setWorkshops(wsData || []);

      // 2. Fetch user's registrations
      const { data: regData, error: regError } = await supabase
        .from('workshop_registrations')
        .select('workshop_id')
        .eq('user_id', currentUser.id);

      if (regError) throw regError;
      setRegistrations((regData || []).map((r: any) => r.workshop_id));

    } catch (err) {
      console.error('Error fetching workshops:', err);
    } finally {
      setWorkshopsLoading(false);
    }
  };

  // --- REGISTER / CANCEL WORKSHOP ---
  const handleToggleWorkshopRegistration = async (workshopId: string) => {
    const isRegistered = registrations.includes(workshopId);
    setRegisteringMap(prev => ({ ...prev, [workshopId]: true }));

    try {
      if (isRegistered) {
        // Cancel pendaftaran
        const { error } = await supabase
          .from('workshop_registrations')
          .delete()
          .eq('workshop_id', workshopId)
          .eq('user_id', currentUser.id);

        if (error) throw error;
        setRegistrations(prev => prev.filter(id => id !== workshopId));
      } else {
        // Daftar
        const { error } = await supabase
          .from('workshop_registrations')
          .insert({
            workshop_id: workshopId,
            user_id: currentUser.id
          });

        if (error) throw error;
        setRegistrations(prev => [...prev, workshopId]);
      }
    } catch (err: any) {
      alert(`Gagal memproses pendaftaran: ${err.message}`);
    } finally {
      setRegisteringMap(prev => ({ ...prev, [workshopId]: false }));
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-8">
      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-jiwo-textDark tracking-tight flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-jiwo-primary" /> Komunitas Jiwo
        </h1>
        <p className="text-xs text-jiwo-textMuted max-w-xs mx-auto">
          Tempat aman berbagi rasa dan tumbuh bersama sahabat Jiwo lainnya.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-jiwo-blueLight/50 p-1.5 rounded-2xl border border-jiwo-primaryLight/20">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'feed'
              ? 'bg-white text-jiwo-primary shadow-xs'
              : 'text-jiwo-textMuted hover:text-jiwo-textDark'
          }`}
        >
          Curhat & Feed
        </button>
        <button
          onClick={() => setActiveTab('workshops')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'workshops'
              ? 'bg-white text-jiwo-primary shadow-xs'
              : 'text-jiwo-textMuted hover:text-jiwo-textDark'
          }`}
        >
          Kelas & Workshop
        </button>
      </div>

      {/* FEED TAB */}
      {activeTab === 'feed' && (
        <div className="space-y-5">
          {/* Post Creation Form */}
          <form onSubmit={handleCreatePost} className="bg-white rounded-3xl p-5 border border-jiwo-primaryLight/20 shadow-3xs space-y-4">
            <textarea
              required
              rows={3}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Keluarkan keluh kesahmu di sini secara aman..."
              className="w-full p-4.5 rounded-2xl border border-jiwo-primaryLight/40 focus:outline-none focus:ring-2 focus:ring-jiwo-primary focus:border-transparent text-sm bg-jiwo-bg/30 text-jiwo-textDark resize-none leading-relaxed"
            />
            
            <div className="flex justify-between items-center pt-1">
              {/* Anonymous Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-jiwo-textMuted select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-jiwo-primary focus:ring-jiwo-primary accent-jiwo-primary"
                />
                <span>Kirim secara Anonim</span>
              </label>

              <button
                type="submit"
                disabled={!newPostContent.trim() || postingLoading}
                className="flex items-center justify-center gap-1.5 bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-bold py-2.5 px-5 rounded-2xl text-xs shadow-xs transition disabled:opacity-50"
              >
                {postingLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Curhat</span>
              </button>
            </div>
          </form>

          {/* Posts Feed */}
          {feedLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <RefreshCw className="w-8 h-8 text-jiwo-primary animate-spin" />
              <span className="text-xs text-jiwo-textMuted font-semibold">Memuat feed komunitas...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-jiwo-primaryLight/20 text-center space-y-3">
              <Users className="w-12 h-12 text-jiwo-primaryLight mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-jiwo-textDark">Feed Masih Sunyi</h3>
                <p className="text-2xs text-jiwo-textMuted max-w-xs mx-auto">
                  Belum ada yang mencurahkan perasaannya hari ini. Jadilah orang pertama yang berbagi!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const hasLiked = post.post_likes.some(l => l.user_id === currentUser?.id);
                const isMyPost = post.user_id === currentUser?.id;
                const isExpanded = expandedPostComments[post.id] || false;

                return (
                  <div 
                    key={post.id} 
                    className="bg-white rounded-3xl p-5 border border-jiwo-primaryLight/15 shadow-3xs space-y-4 hover:border-jiwo-primaryLight/40 transition duration-200"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          post.anonymous 
                            ? 'bg-slate-100 text-slate-500 border border-slate-200' 
                            : 'bg-jiwo-primaryLight text-jiwo-primary border border-jiwo-primary/20'
                        }`}>
                          {post.anonymous ? '👤' : (post.profiles?.nama?.[0]?.toUpperCase() || 'S')}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-jiwo-textDark leading-tight">
                            {post.anonymous ? 'Sahabat Anonim' : (post.profiles?.nama || 'Sahabat')}
                          </h4>
                          <span className="text-5xs text-jiwo-textMuted font-bold uppercase tracking-wider block mt-0.5">
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                      </div>

                      {isMyPost && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 rounded-lg text-jiwo-textMuted hover:text-jiwo-stress hover:bg-jiwo-stress/10 transition"
                          title="Hapus Curhat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-xs sm:text-sm text-jiwo-textDark leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Interaction Buttons */}
                    <div className="flex gap-4 border-t border-jiwo-bg pt-3.5 text-2xs font-bold">
                      <button
                        onClick={() => handleToggleLike(post)}
                        className={`flex items-center gap-1.5 transition py-1 px-2.5 rounded-xl ${
                          hasLiked 
                            ? 'text-jiwo-primary bg-jiwo-primaryLight/45' 
                            : 'text-jiwo-textMuted hover:text-jiwo-primary hover:bg-jiwo-primaryLight/15'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                        <span>{post.post_likes.length} Like</span>
                      </button>

                      <button
                        onClick={() => setExpandedPostComments(prev => ({ ...prev, [post.id]: !isExpanded }))}
                        className={`flex items-center gap-1.5 transition py-1 px-2.5 rounded-xl ${
                          isExpanded 
                            ? 'text-jiwo-primary bg-jiwo-primaryLight/45' 
                            : 'text-jiwo-textMuted hover:text-jiwo-primary hover:bg-jiwo-primaryLight/15'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.community_comments?.length || 0} Komentar</span>
                      </button>
                    </div>

                    {/* COMMENTS ACCORDION SECTION */}
                    {isExpanded && (
                      <div className="space-y-4 pt-3 border-t border-dashed border-jiwo-primaryLight/20 animate-fade-in">
                        {/* Comments List */}
                        {post.community_comments?.length > 0 ? (
                          <div className="space-y-3 pl-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                            {post.community_comments.map((comment) => (
                              <div key={comment.id} className="bg-jiwo-bg/40 border border-jiwo-primaryLight/10 rounded-2xl p-3 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-3xs font-extrabold text-jiwo-textDark">
                                    {comment.profiles?.nama || 'Sahabat'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-5xs text-jiwo-textMuted font-semibold">
                                      {formatDate(comment.created_at)}
                                    </span>
                                    {comment.user_id === currentUser?.id && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-jiwo-textMuted hover:text-jiwo-stress p-0.5 rounded transition"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-2xs text-jiwo-textDark leading-normal">
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-4xs text-center text-jiwo-textMuted py-2 italic">Belum ada tanggapan. Berikan saran pertamamu!</p>
                        )}

                        {/* Comment Input Box */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Tanggapi curhat di atas..."
                            className="flex-grow px-3.5 py-2.5 rounded-xl border border-jiwo-primaryLight/35 focus:outline-none focus:ring-1 focus:ring-jiwo-primary text-xs bg-jiwo-bg/30 text-jiwo-textDark"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!(commentInputs[post.id] || '').trim() || commentingLoading[post.id]}
                            className="bg-jiwo-primary hover:bg-jiwo-primary/95 text-white p-2.5 rounded-xl shadow-xs transition disabled:opacity-40"
                          >
                            {commentingLoading[post.id] ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WORKSHOPS TAB */}
      {activeTab === 'workshops' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-jiwo-primaryLight/20 border border-jiwo-primary/15 rounded-3xl p-5 flex gap-4 items-start shadow-3xs">
            <div className="w-10 h-10 rounded-2xl bg-jiwo-primary/15 text-jiwo-primary flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-jiwo-textDark">Jiwo Healing Circle</h3>
              <p className="text-2xs text-jiwo-textMuted leading-relaxed">
                Ikuti sesi mediatif, sharing curhat terarah, yoga luring virtual, dan bimbingan kesehatan jiwa gratis bersama instruktur dan psikolog berlisensi.
              </p>
            </div>
          </div>

          {/* Workshop Cards List */}
          {workshopsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <RefreshCw className="w-8 h-8 text-jiwo-primary animate-spin" />
              <span className="text-xs text-jiwo-textMuted font-semibold">Memuat jadwal workshop...</span>
            </div>
          ) : workshops.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-jiwo-primaryLight/20 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-jiwo-primaryLight mx-auto" />
              <h3 className="font-bold text-sm text-jiwo-textDark">Tidak Ada Workshop Aktif</h3>
              <p className="text-2xs text-jiwo-textMuted">Jadwal baru sedang dipersiapkan oleh tim konselor kami.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workshops.map((ws) => {
                const isRegistered = registrations.includes(ws.id);
                const isProcessing = registeringMap[ws.id] || false;

                return (
                  <div 
                    key={ws.id}
                    className="bg-white border border-jiwo-primaryLight/15 p-5 rounded-3xl shadow-3xs space-y-4 hover:border-jiwo-primaryLight/45 transition duration-200"
                  >
                    {/* Category & Badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-4xs font-bold uppercase tracking-wider text-jiwo-primary bg-jiwo-primaryLight/35 px-2.5 py-1 rounded-md">
                        {ws.category}
                      </span>
                      {isRegistered && (
                        <span className="flex items-center gap-1 text-4xs font-bold text-jiwo-sage bg-jiwo-sageLight/50 border border-jiwo-sage/20 px-2 py-0.5 rounded-full animate-bounce">
                          <CheckCircle2 className="w-3 h-3 text-jiwo-sage" /> Terdaftar
                        </span>
                      )}
                    </div>

                    {/* Title & Desc */}
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-jiwo-textDark leading-snug">
                        {ws.title}
                      </h3>
                      <p className="text-2xs text-jiwo-textMuted leading-relaxed">
                        {ws.description}
                      </p>
                    </div>

                    {/* Time & Host */}
                    <div className="bg-jiwo-bg/40 border border-jiwo-primaryLight/10 p-3.5 rounded-2xl space-y-1.5 text-xs text-jiwo-textDark">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-jiwo-primary shrink-0" />
                        <span className="font-bold">{ws.date}</span>
                        <span>•</span>
                        <span className="font-medium text-jiwo-textMuted">{ws.time} WIB</span>
                      </div>
                      <div className="flex items-center gap-2 text-2xs text-jiwo-textMuted">
                        <span>Fasilitator:</span>
                        <span className="font-bold text-jiwo-textDark">{ws.instructor}</span>
                      </div>
                    </div>

                    {/* Registrants counter & CTA Action Row */}
                    <div className="flex justify-between items-center pt-2 border-t border-jiwo-bg">
                      <div className="text-4xs text-jiwo-textMuted font-bold uppercase tracking-wider">
                        Kapasitas Sesi: {ws.max_participants} Orang
                      </div>

                      <div className="flex items-center gap-2">
                        {isRegistered ? (
                          <>
                            <button
                              onClick={() => {
                                window.open(ws.link, '_blank');
                              }}
                              className="bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-extrabold py-2 px-4 rounded-xl text-3xs shadow-3xs transition flex items-center gap-1"
                            >
                              <Video className="w-3.5 h-3.5 shrink-0" />
                              <span>Mulai Kelas</span>
                            </button>

                            <button
                              onClick={() => handleToggleWorkshopRegistration(ws.id)}
                              disabled={isProcessing}
                              className="text-3xs font-extrabold text-jiwo-stress hover:bg-jiwo-stress/10 border border-jiwo-stress/25 py-2 px-3 rounded-xl transition"
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleWorkshopRegistration(ws.id)}
                            disabled={isProcessing}
                            className="bg-jiwo-primary hover:bg-jiwo-primary/95 text-white font-extrabold py-2 px-4.5 rounded-xl text-3xs shadow-3xs transition"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>Daftar Kelas</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quote Banner */}
      <div className="bg-jiwo-blueLight/10 border border-jiwo-primaryLight/15 rounded-3xl p-5 text-center space-y-1">
        <Heart className="w-5 h-5 text-jiwo-primary fill-current mx-auto animate-pulse" />
        <p className="text-2xs font-bold text-jiwo-textDark">"Di Jiwo.ai, suaramu didengar dan pelukanmu nyata."</p>
        <p className="text-5xs text-jiwo-textMuted font-extrabold uppercase tracking-widest">Sahabat Tumbuh Jiwo</p>
      </div>

    </div>
  );
}
