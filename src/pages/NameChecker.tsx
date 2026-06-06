import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ALUU_GAMES, GameCheckerOption } from "@/lib/aluuGameCodes";

interface HistoryEntry {
  code: string;
  label: string;
  userId: string;
  serverId?: string;
  username: string;
  region?: string;
  at: number;
}

const HISTORY_KEY = "scaliver_name_checker_history";

const NameChecker = () => {
  const { toast } = useToast();
  const [gameCode, setGameCode] = useState<string>(ALUU_GAMES[0].code);
  const [userId, setUserId] = useState("");
  const [serverId, setServerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; username: string; region?: string }
    | { ok: false; error: string }
    | null
  >(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const game: GameCheckerOption = useMemo(
    () => ALUU_GAMES.find((g) => g.code === gameCode) || ALUU_GAMES[0],
    [gameCode]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    setResult(null);
  }, [gameCode, userId, serverId]);

  const saveHistory = (entry: HistoryEntry) => {
    const next = [entry, ...history.filter(h => !(h.code === entry.code && h.userId === entry.userId && h.serverId === entry.serverId))].slice(0, 10);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {/* ignore */}
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {/* ignore */}
  };

  const handleCheck = async () => {
    if (!userId.trim()) {
      toast({ title: `${game.userLabel || "Player ID"} required`, variant: "destructive" });
      return;
    }
    if (game.requiresServer && !serverId.trim()) {
      toast({ title: `${game.serverLabel || "Server ID"} required`, variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("aluu-order", {
        body: {
          action: "name_check",
          gameCode: game.code,
          userId: userId.trim(),
          serverId: game.requiresServer ? serverId.trim() : undefined,
        },
      });
      if (error) throw error;
      const username = data?.username || "";
      if (data?.success === true && username) {
        const region = data?.region || data?.country;
        setResult({ ok: true, username, region });
        saveHistory({
          code: game.code, label: game.label,
          userId: userId.trim(),
          serverId: game.requiresServer ? serverId.trim() : undefined,
          username, region, at: Date.now(),
        });
      } else {
        setResult({ ok: false, error: data?.error || data?.message || "Player Not Found" });
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: text });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Game Name Checker | Scaliver Official</title>
        <meta name="description" content="Check player username and region for MLBB, PUBG, Free Fire, Genshin Impact and more — instant Game Name Checker by Scaliver Official." />
        <link rel="canonical" href="https://scaliverofficial.in/name-checker" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Game Name Checker</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Verify any player ID across multiple games. Powered by ALUU Name Checker.
        </p>

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Game</Label>
            <Select value={gameCode} onValueChange={setGameCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {ALUU_GAMES.map(g => (
                  <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{game.userLabel || "Player ID"}</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={`Enter ${game.userLabel || "Player ID"}`} />
          </div>

          {game.requiresServer && (
            <div className="space-y-2">
              <Label>{game.serverLabel || "Server ID"}</Label>
              <Input value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder={`Enter ${game.serverLabel || "Server ID"}`} />
            </div>
          )}

          <Button onClick={handleCheck} disabled={loading} className="w-full">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</>) : (<><Search className="w-4 h-4 mr-2" /> Validate Player</>)}
          </Button>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-3 text-sm border ${result.ok ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10"}`}
            >
              {result.ok ? (
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Player:</span> <b>{result.username}</b>
                    <button onClick={() => copy(result.username)} className="ml-2 inline-flex items-center text-xs text-primary hover:underline">
                      <Copy className="w-3 h-3 mr-1" />copy
                    </button>
                  </p>
                  {result.region && <p><span className="text-muted-foreground">Region:</span> <b>{result.region}</b></p>}
                  <p className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Validated Successfully</p>
                </div>
              ) : (
                <p className="text-destructive flex items-center gap-1"><X className="w-4 h-4" /> {result.error || "Player Not Found"}</p>
              )}
            </motion.div>
          )}
        </Card>

        {history.length > 0 && (
          <Card className="mt-6 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Recent Checks</h2>
              <Button variant="ghost" size="sm" onClick={clearHistory}>Clear</Button>
            </div>
            <ul className="divide-y divide-border">
              {history.map((h, i) => (
                <li key={`${h.code}-${h.userId}-${h.at}-${i}`} className="py-2 flex items-center justify-between gap-2">
                  <div className="text-sm min-w-0">
                    <p className="truncate"><b>{h.username}</b> <span className="text-muted-foreground">· {h.label}</span></p>
                    <p className="text-xs text-muted-foreground truncate">ID: {h.userId}{h.serverId ? ` · Server: ${h.serverId}` : ""}{h.region ? ` · ${h.region}` : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(h.username)}><Copy className="w-3 h-3" /></Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default NameChecker;
