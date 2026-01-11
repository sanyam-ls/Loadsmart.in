import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Phone, Mail, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export function HelpBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamError(false);

    const assistantId = `assistant-${Date.now()}`;
    let assistantContent = "";

    try {
      const response = await fetch("/api/helpbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
              }
              
              if (data.error) {
                setStreamError(true);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId 
                      ? { ...m, content: data.error, isError: true } 
                      : m
                  )
                );
                break;
              }
              
              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  )
                );
              }
              
              if (data.done) {
                break;
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Handle case where stream ends with empty content
      if (!assistantContent && !streamError) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I couldn't generate a response. Please try again.", isError: true }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      // If we already added an assistant message placeholder, update it with error
      setMessages((prev) => {
        const hasPlaceholder = prev.some(m => m.id === assistantId);
        if (hasPlaceholder) {
          return prev.map(m =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I encountered an error. Please try again or contact our support team.", isError: true }
              : m
          );
        }
        return [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant" as const,
            content: "Sorry, I encountered an error. Please try again or contact our support team.",
            timestamp: new Date(),
            isError: true,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId, streamError]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setShowContactInfo(false);
    setStreamError(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    startNewConversation();
  };

  const handleMinimize = () => {
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
        data-testid="button-helpbot-open"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-background border rounded-lg shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">FreightFlow Help</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={handleMinimize}
            title="Minimize chat"
            data-testid="button-helpbot-minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={handleClose}
            title="Close and end chat"
            data-testid="button-helpbot-close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center space-y-4 pt-8">
            <div className="text-4xl">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">How can we help you?</h3>
            <p className="text-sm text-muted-foreground">
              Ask me anything about FreightFlow, or connect with our support team.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput("How do I post a load?")}
                data-testid="button-helpbot-quick-post-load"
              >
                Post a load
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput("How do I track my shipment?")}
                data-testid="button-helpbot-quick-track"
              >
                Track shipment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput("What documents do I need?")}
                data-testid="button-helpbot-quick-docs"
              >
                Required docs
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.isError
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content || (isLoading && message.role === "assistant" ? "Thinking..." : "")}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {showContactInfo && (
        <div className="px-4 py-3 bg-muted/50 border-t">
          <p className="text-sm font-medium mb-2">Contact Support</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>+91 1800-XXX-XXXX</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>support@freightflow.in</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t">
        <div className="flex gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowContactInfo(!showContactInfo)}
            data-testid="button-helpbot-contact"
          >
            <Phone className="h-3 w-3 mr-1" />
            Contact Support
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={startNewConversation}
              data-testid="button-helpbot-new-chat"
            >
              New Chat
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1"
            data-testid="input-helpbot-message"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            data-testid="button-helpbot-send"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
