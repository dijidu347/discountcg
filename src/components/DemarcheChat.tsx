import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  demarche_id: string;
  garage_id: string;
  sender_type: "admin" | "garage";
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface DemarcheChatProps {
  demarcheId: string;
  garageId: string;
  garageEmail?: string;
  garageName?: string;
  isAdmin?: boolean;
  numeroDemarche?: string;
  // Appele apres l'envoi d'un message. La page des messages s'en sert pour
  // retirer la conversation de la liste : y repondre la rend traitee.
  onMessageSent?: () => void;
}

export function DemarcheChat({
  demarcheId,
  garageId,
  garageEmail,
  garageName,
  isAdmin = false,
  onMessageSent,
  numeroDemarche,
}: DemarcheChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${demarcheId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `demarche_id=eq.${demarcheId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          // Mark as read if we're the recipient
          const msg = payload.new as Message;
          if (
            (isAdmin && msg.sender_type === "garage") ||
            (!isAdmin && msg.sender_type === "admin")
          ) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", msg.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demarcheId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when opened
  useEffect(() => {
    if (messages.length > 0) {
      const unreadIds = messages
        .filter(
          (m) =>
            !m.is_read &&
            ((isAdmin && m.sender_type === "garage") ||
              (!isAdmin && m.sender_type === "admin"))
        )
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadIds)
          .then();
      }
    }
  }, [messages, isAdmin]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("demarche_id", demarcheId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const senderType = isAdmin ? "admin" : "garage";

    const { error } = await supabase.from("messages").insert({
      demarche_id: demarcheId,
      garage_id: garageId,
      sender_type: senderType,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
      setSending(false);
      return;
    }

    // Cinq messages d'affilée ne font pas cinq nouvelles : ils font une
    // conversation. On ne prévient donc que si le message précédent vient de
    // l'autre partie — le nôtre est alors une réponse, qui mérite un signal.
    // Sauf si ce précédent est vieux de plus de deux heures : c'est une
    // relance restée sans réponse, et elle doit ressortir.
    const { data: avant } = await supabase
      .from("messages")
      .select("sender_type, created_at")
      .eq("demarche_id", demarcheId)
      .order("created_at", { ascending: false })
      .range(1, 1);

    const precedent = avant?.[0];
    const monologue = precedent?.sender_type === senderType;
    const depuis = precedent ? Date.now() - new Date(precedent.created_at).getTime() : Infinity;
    const doitPrevenir = !monologue || depuis > 2 * 60 * 60 * 1000;

    // Send email notification
    try {
      if (!doitPrevenir) {
        // Rien à envoyer : la conversation est déjà ouverte en face.
      } else if (isAdmin && garageEmail) {
        // Admin sends -> notify garage by email
        await supabase.functions.invoke("send-email", {
          body: {
            type: "new_message_notification",
            to: garageEmail,
            data: {
              sender_name: "Discount Carte Grise",
              garage_name: garageName || "",
              reference: numeroDemarche || demarcheId,
              demarche_id: demarcheId,
              message_preview: newMessage.trim().substring(0, 150),
            },
          },
        });
      }
      // Le garage qui ecrit ne declenche plus d'e-mail : la carte « Messages
      // en attente » du tableau de bord admin tient ce role.
    } catch (e) {
      console.error("Email notification failed:", e);
    }

    setNewMessage("");
    setSending(false);
    onMessageSent?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messagerie
          {numeroDemarche && (
            <span className="text-sm font-normal text-muted-foreground">
              - {numeroDemarche}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="h-[300px] overflow-y-auto border rounded-lg p-3 mb-3 space-y-3 bg-muted/20"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun message. Commencez la conversation !
            </p>
          ) : (
            messages.map((msg) => {
              const isMine =
                (isAdmin && msg.sender_type === "admin") ||
                (!isAdmin && msg.sender_type === "garage");
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isMine
                        ? "bg-blue-600 text-white"
                        : "bg-white border shadow-sm"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {msg.sender_type === "admin" ? "Admin" : garageName || "Garage"}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isMine ? "text-blue-200" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            className="min-h-[60px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
