import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/cookieAwareClient';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  creator_name?: string;
}

interface CommentsSectionProps {
  recipeId: string;
  isPublished: boolean;
}

const CommentsSection = ({ recipeId, isPublished }: CommentsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      // Create profile map
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile.display_name])
      );

      // Combine comments with creator names
      const commentsWithCreators = commentsData.map(comment => ({
        ...comment,
        creator_name: profilesMap.get(comment.user_id) || 'Unbekannt'
      }));

      setComments(commentsWithCreators);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Fehler",
        description: "Kommentare konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPublished) {
      fetchComments();
    } else {
      setLoading(false);
    }
  }, [recipeId, isPublished]);

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          recipe_id: recipeId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Fehler",
        description: "Kommentar konnte nicht hinzugefügt werden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Fehler",
        description: "Kommentar konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  if (!isPublished) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <MessageCircle className="h-5 w-5 mr-2" />
            <span>Kommentare sind nur für veröffentlichte Rezepte verfügbar</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <MessageCircle className="h-5 w-5 mr-2" />
          <h3 className="text-lg font-semibold">
            Kommentare ({comments.length})
          </h3>
        </div>

        {/* Add comment form */}
        {user && (
          <div className="mb-6">
            <Textarea
              placeholder="Schreibe einen Kommentar..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <Button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="ml-auto flex"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Wird gesendet...' : 'Kommentar hinzufügen'}
            </Button>
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground">
              Kommentare werden geladen...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Noch keine Kommentare vorhanden. 
              {user ? ' Sei der Erste!' : ' Melde dich an, um zu kommentieren.'}
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.creator_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{comment.creator_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {user && user.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentsSection;