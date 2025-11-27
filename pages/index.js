// pages/index.js
import { useEffect, useState } from "react";

export default function Home() {
  const [keys, setKeys] = useState([]);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [botToken, setBotToken] = useState("");
  const [botTokenSaved, setBotTokenSaved] = useState(false);

  const [settings, setSettings] = useState({
    ownerName: "",
    botName: "",
    botUsername: "",
    gender: "female",
    personality: "normal",
    groupLink: "",
  });

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [groups, setGroups] = useState([]);

  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const resKeys = await fetch("/api/keys");
        const dataKeys = await resKeys.json();
        if (dataKeys.ok) setKeys(dataKeys.keys || []);

        const resBot = await fetch("/api/bot-config");
        const dataBot = await resBot.json();
        if (dataBot.ok && dataBot.config?.telegramBotToken) {
          setBotToken(dataBot.config.telegramBotToken);
          setBotTokenSaved(true);
        }

        const resSettings = await fetch("/api/bot-settings");
        const dataSettings = await resSettings.json();
        if (dataSettings.ok && dataSettings.settings) {
          setSettings((prev) => ({ ...prev, ...dataSettings.settings }));
        }

        const resGroups = await fetch("/api/groups");
        const dataGroups = await resGroups.json();
        if (dataGroups.ok) setGroups(dataGroups.groups || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // ----- Gemini keys -----
  const addKey = async () => {
    if (!apiKey.trim()) return;
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, key: apiKey }),
    });
    const data = await res.json();
    if (data.ok) {
      setKeys(data.keys || []);
      setLabel("");
      setApiKey("");
    }
  };

  const toggleKey = async (id, active) => {
    const res = await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    const data = await res.json();
    if (data.ok) setKeys(data.keys || []);
  };

  const deleteKey = async (id) => {
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.ok) setKeys(data.keys || []);
  };

  // ----- Bot token -----
  const saveBotToken = async () => {
    if (!botToken.trim()) return;
    const res = await fetch("/api/bot-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramBotToken: botToken }),
    });
    const data = await res.json();
    if (data.ok) {
      setBotTokenSaved(true);
      alert("Bot token saved ✅");
    } else {
      alert("Failed to save token");
    }
  };

  const handleSetWebhook = () => {
    if (!botToken || !botTokenSaved) return;
    if (typeof window === "undefined") return;

    const origin = window.location.origin;
    const webhookUrl = `${origin}/api/telegram-webhook`;
    const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(
      webhookUrl
    )}`;

    window.open(url, "_blank");
  };

  // ----- Bot settings -----
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.ok) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
        alert("Settings saved ✅");
      } else {
        alert("Failed to save settings");
      }
    } catch (e) {
      console.error(e);
      alert("Error while saving settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  // ----- Test chat -----
  const sendTest = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestReply("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage }),
      });
      const data = await res.json();
      if (data.ok) setTestReply(data.reply || "");
      else setTestReply("Error from API");
    } catch (e) {
      console.error(e);
      setTestReply("Request error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center px-3 py-6">
      <div className="w-full max-w-5xl space-y-6">
        <header className="bg-slate-900/70 border border-slate-800 rounded-3xl px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm tracking-wide text-emerald-300">
                YUKI ONLINE
              </span>
            </div>
            <h1 className="text-2xl font-semibold mt-1">
              YUKI · AI ORCHESTRATOR
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi Gemini keys · MongoDB · Telegram bot · Auto failover
            </p>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Gemini keys */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h2 className="text-lg font-semibold">Gemini API Keys</h2>
            <div className="space-y-2">
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder="Label (Main key / Backup)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                onClick={addKey}
                className="mt-1 inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium bg-gradient-to-r from-sky-500 to-fuchsia-500"
              >
                + Add Key
              </button>
              <p className="text-xs text-slate-400">
                Active keys will be used in order. If one hits rate limit, Yuki
                auto-switches to the next.
              </p>
            </div>

            <div className="space-y-1 max-h-40 overflow-auto text-xs">
              {keys.length === 0 && (
                <p className="text-slate-500">No keys yet. Add at least one Gemini API key.</p>
              )}
              {keys.map((k) => (
                <div
                  key={k._id}
                  className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {k.label || "Untitled key"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {k.active ? "active" : "inactive"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 break-all">
                      {k.key}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <button
                      onClick={() => toggleKey(k._id, !k.active)}
                      className="text-[10px] px-2 py-1 rounded-full border border-slate-700"
                    >
                      {k.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteKey(k._id)}
                      className="text-[10px] px-2 py-1 rounded-full border border-red-500/60 text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Telegram bot token + webhook */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h2 className="text-lg font-semibold">Telegram Bot</h2>
            <div className="space-y-2">
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-sky-500"
                placeholder="123456:ABCDEF..."
                value={botToken}
                onChange={(e) => {
                  setBotToken(e.target.value);
                  setBotTokenSaved(false);
                }}
              />
              <button
                onClick={saveBotToken}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium bg-gradient-to-r from-sky-500 to-fuchsia-500"
              >
                {botTokenSaved ? "Update Bot Token" : "Save Bot Token"}
              </button>
              <p className="text-xs text-slate-400">
                Set Telegram webhook to:
                <br />
                <span className="text-slate-300">
                  https://your-domain/api/telegram-webhook
                </span>
              </p>

              <button
                onClick={handleSetWebhook}
                disabled={!botToken || !botTokenSaved}
                className={`mt-2 inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium ${
                  !botToken || !botTokenSaved
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-sky-500"
                }`}
              >
                Set Webhook
              </button>
              <p className="text-[11px] text-slate-500">
                Token save hone ke baad hi webhook button active hoga. Click karte
                hi Telegram setWebhook URL new tab me open ho jayega.
              </p>
            </div>
          </section>
        </div>

        {/* Bot settings + Test chat */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Bot settings */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h2 className="text-lg font-semibold">Bot Settings</h2>

            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Owner Name
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 outline-none focus:border-sky-500"
                  value={settings.ownerName}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, ownerName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bot Name
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 outline-none focus:border-sky-500"
                  value={settings.botName}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, botName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bot Username (@ ke bina ya sath dono chalega)
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 outline-none focus:border-sky-500"
                  value={settings.botUsername}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, botUsername: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Gender
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 outline-none focus:border-sky-500"
                    value={settings.gender}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, gender: e.target.value }))
                    }
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Personality
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 outline-none focus:border-sky-500"
                    value={settings.personality}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        personality: e.target.value,
                      }))
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="flirty">Flirty</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Group Link (start message pe jayega)
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 outline-none focus:border-sky-500"
                  placeholder="https://t.me/yourgroup"
                  value={settings.groupLink}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, groupLink: e.target.value }))
                  }
                />
              </div>

              <button
                onClick={saveSettings}
                disabled={settingsSaving}
                className="mt-2 inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium bg-gradient-to-r from-sky-500 to-fuchsia-500 disabled:opacity-60"
              >
                {settingsSaving ? "Saving..." : "Save Settings"}
              </button>
              <p className="text-[11px] text-slate-500">
                Ye settings poore bot pe apply hongi. Owner ka naam wahi hoga jo
                yaha diya hai, jab koi owner / creator poochega.
              </p>
            </div>
          </section>

          {/* Test chat */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h2 className="text-lg font-semibold">Test Chat with Yuki</h2>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-sky-500 min-h-[80px]"
              placeholder="Ask Yuki anything..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
            <button
              onClick={sendTest}
              disabled={testing}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium bg-gradient-to-r from-sky-500 to-fuchsia-500 disabled:opacity-60"
            >
              {testing ? "Sending..." : "Send"}
            </button>
            {testReply && (
              <div className="mt-3 text-sm bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2">
                {testReply}
              </div>
            )}
          </section>
        </div>

        {/* Groups list */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">Logged Groups</h2>
          <p className="text-xs text-slate-400 mb-2">
            Jaha bhi bot group me message dekhega, us group ka ID yaha list me
            aa jayega.
          </p>
          <div className="space-y-1 max-h-52 overflow-auto text-xs">
            {groups.length === 0 && (
              <p className="text-slate-500">No group activity logged yet.</p>
            )}
            {groups.map((g) => (
              <div
                key={g._id}
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2"
              >
                <div className="flex-1">
                  <div className="font-medium">{g.title || "Untitled group"}</div>
                  <div className="text-[10px] text-slate-500">
                    ID: {g.chatId}
                    {g.username && ` · @${g.username}`}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 ml-2 uppercase">
                  {g.type}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
    }
