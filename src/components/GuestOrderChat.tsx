import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  order_id: string;
  sender_type: "admin" | "client";
  sender_email: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface GuestOrderChatProps {
  orderId: string;
  isAdmin: boolean;
  trackingNumber?: string;
  guestEmail?: string;
  guestName?: string;
}

export function GuestOrderChat({
  orderId,
  isAdmin,
  trackingNumber,
  guestEmail,
  guestName,
}: GuestOrderChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`guest-chat-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "guest_order_messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
          // Mark as read if we're the recipient
          const msg = payload.new as Message;
          if (
            (isAdmin && msg.sender_type === "client") ||
            (!isAdmin && msg.sender_type === "admin")
          ) {
            if (isAdmin) {
              supabase
                .from("guest_order_messages")
                .update({ is_read: true })
                .eq("id", msg.id)
                .then();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when opened (admin side only, direct DB access)
  useEffect(() => {
    if (isAdmin && messages.length > 0) {
      const unreadIds = messages
        .filter((m) => !m.is_read && m.sender_type === "client")
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        supabase
          .from("guest_order_messages")
          .update({ is_read: true })
          .in("id", unreadIds)
          .then();
      }
    }
  }, [messages, isAdmin]);

  const loadMessages = async () => {
    setLoading(true);
    if (isAdmin) {
      // Admin: direct DB access
      const { data, error } = await supabase
        .from("guest_order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
      }
    } else {
      // Guest: use edge function
      try {
        const { data, error } = await supabase.functions.invoke("guest-order-message", {
          body: {
            action: "get",
            tracking_number: trackingNumber,
            order_id: orderId,
          },
        });

        if (!error && data?.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);

    if (isAdmin) {
      // Admin: direct insert + email notification to guest
      const { error } = await supabase.from("guest_order_messages").insert({
        order_id: orderId,
        sender_type: "admin",
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

      // Send email notification to guest
      if (guestEmail) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "guest_new_message",
              to: guestEmail,
              data: {
                customer_name: guestName || "Client",
                tracking_number: trackingNumber || "",
                message_preview: newMessage.trim().substring(0, 200),
              },
            },
          });
        } catch (e) {
          console.error("Email notification failed:", e);
        }
      }
    } else {
      // Guest: use edge function
      try {
        const { data, error } = await supabase.functions.invoke("guest-order-message", {
          body: {
            action: "send",
            tracking_number: trackingNumber,
            order_id: orderId,
            content: newMessage.trim(),
            sender_email: guestEmail,
          },
        });

        if (error || !data?.success) {
          toast({
            title: "Erreur",
            description: "Impossible d'envoyer le message",
            variant: "destructive",
          });
          setSending(false);
          return;
        }
      } catch (err) {
        console.error("Error sending message:", err);
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer le message",
          variant: "destructive",
        });
        setSending(false);
        return;
      }
    }

    setNewMessage("");
    setSending(false);

    // Reload messages for guest (no realtime without auth)
    if (!isAdmin) {
      setTimeout(() => loadMessages(), 500);
    }
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
          {trackingNumber && (
            <span className="text-sm font-normal text-muted-foreground">
              - {trackingNumber}
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun message. Commencez la conversation !
            </p>
          ) : (
            messages.map((msg) => {
              const isMine =
                (isAdmin && msg.sender_type === "admin") ||
                (!isAdmin && msg.sender_type === "client");
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
                      {msg.sender_type === "admin"
                        ? "Discount Carte Grise"
                        : guestName || "Client"}
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
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
