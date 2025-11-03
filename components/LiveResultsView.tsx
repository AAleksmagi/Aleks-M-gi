import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { AppState, ChampionshipStanding, Participant } from '../types';
import { AppPhase } from '../constants';
import TournamentBracket from './TournamentBracket';

type ConnectionStatus = 'connecting' | 'live' | 'error';

const LiveQualificationResults: React.FC<{ participants: Participant[] }> = ({ participants }) => {
    const sortedParticipants = useMemo(() => 
        [...participants]
        .filter(p => p.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
     [participants]);

    return (
        <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
             <h2 className="text-2xl font-bold text-blue-300 mb-4">Kvalifikatsiooni tulemused</h2>
             <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {sortedParticipants.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Kvalifikatsioon pole veel alanud või tulemusi pole sisestatud.</p>
                ) : (
                    sortedParticipants.map((p, index) => (
                        <div key={p.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-gray-700">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg w-8 text-center">{index + 1}.</span>
                                <span className="font-semibold text-lg">{p.name}</span>
                            </div>
                            <span className="font-bold text-xl text-yellow-400">{p.score}</span>
                        </div>
                    ))
                )}
             </div>
        </div>
    );
};

const LiveStandingsTable: React.FC<{ standings: ChampionshipStanding[], competitionsHeld: number }> = ({ standings, competitionsHeld }) => {
    const getTotalPoints = (p: ChampionshipStanding) => p.pointsPerCompetition.reduce((sum, pts) => sum + pts, 0);
    const sortedStandings = [...standings].sort((a, b) => getTotalPoints(b) - getTotalPoints(a));

    return (
        <div className="max-w-7xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">Hooaja edetabel</h2>
             <div className="overflow-x-auto">
                {sortedStandings.length > 0 ? (
                    <table className="w-full min-w-max">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="p-3 text-left text-sm font-semibold text-gray-400 tracking-wider w-16">Koht</th>
                                <th className="p-3 text-left text-sm font-semibold text-gray-400 tracking-wider">Nimi</th>
                                {Array.from({ length: competitionsHeld }, (_, i) => (
                                    <th key={i} className="p-3 text-center text-sm font-semibold text-gray-400 tracking-wider w-24">Etapp {i + 1}</th>
                                ))}
                                <th className="p-3 text-center text-sm font-semibold text-yellow-300 tracking-wider w-24">Kokku</th>
                            </tr>
                        </thead>
                         <tbody>
                            {sortedStandings.map((p, index) => (
                                <tr key={p.id} className="border-b border-gray-700">
                                    <td className="p-3 font-bold text-center">{index + 1}.</td>
                                    <td className="p-3 font-semibold">{p.name}</td>
                                    {Array.from({ length: competitionsHeld }, (_, i) => (
                                        <td key={i} className="p-3 text-center text-gray-400">{p.pointsPerCompetition[i] ?? 0}</td>
                                    ))}
                                    <td className="p-3 text-center font-bold text-yellow-400">{getTotalPoints(p)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-center text-gray-400 py-4">Edetabel on tühi.</p>
                )}
            </div>
        </div>
    );
};


const LiveStatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const statusConfig = {
    connecting: { text: 'Ühendan...', color: 'bg-yellow-500', pulse: true },
    live: { text: 'Live', color: 'bg-green-500', pulse: true },
    error: { text: 'Viga', color: 'bg-red-500', pulse: false },
  };
  const config = statusConfig[status];

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold border border-gray-600">
      <span className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}></span>
      <span>{config.text}</span>
    </div>
  );
};


const LiveResultsView: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const [liveState, setLiveState] = useState<AppState | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const reconnectTimeoutRef = useRef<number | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        let isComponentMounted = true;

        // Helper function to extract state from ntfy message (handles both inline and attachment)
        const extractStateFromMessage = async (ntfyMessage: any): Promise<AppState | null> => {
            if (ntfyMessage.event !== 'message' || ntfyMessage.title !== 'AppStateUpdate') {
                return null;
            }

            // Check if state is in an attachment (happens when message is too large)
            if (ntfyMessage.attachment && ntfyMessage.attachment.url) {
                try {
                    const attachmentResponse = await fetch(ntfyMessage.attachment.url);
                    if (!attachmentResponse.ok) {
                        console.error("Failed to fetch attachment:", attachmentResponse.statusText);
                        return null;
                    }
                    return await attachmentResponse.json();
                } catch (e) {
                    console.error("Failed to parse attachment:", e);
                    return null;
                }
            }

            // Otherwise, state is inline in the message field
            if (ntfyMessage.message) {
                try {
                    return JSON.parse(ntfyMessage.message);
                } catch (e) {
                    console.error("Failed to parse inline message:", e);
                    return null;
                }
            }

            return null;
        };

        // See funktsioon laeb lehe avamisel kohe viimase salvestatud seisu. See tagab,
        // et kasutaja näeb koheselt tulemusi ega pea ootama esimest reaalajas uuendust.
        const fetchInitialState = async () => {
            try {
                const response = await fetch(`https://ntfy.sh/${sessionId}/json?poll=1`);
                if (!response.ok) {
                    // 404 is normal if no messages exist yet - will get updates via SSE
                    if (response.status === 404) {
                        console.log("No messages yet, waiting for live updates");
                        return;
                    }
                    console.warn(`Could not fetch initial state: ${response.statusText}`);
                    return;
                }
                const ntfyMessage = await response.json();
                const newState = await extractStateFromMessage(ntfyMessage);
                if (newState && isComponentMounted) {
                    setLiveState(newState);
                    setConnectionStatus('live');
                }
            } catch (e) {
                // Log but don't show error to user - SSE will provide updates
                console.log("Could not fetch initial state, waiting for live updates:", e);
            }
        };

        const connectSSE = () => {
            if (!isComponentMounted) return;

            const eventSource = new EventSource(`https://ntfy.sh/${sessionId}/sse`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                if (isComponentMounted) {
                    setConnectionStatus('live');
                }
            };

            eventSource.onmessage = async (event) => {
                try {
                    const ntfyMessage = JSON.parse(event.data);
                    // Only process actual message events, not open/keepalive events
                    if (ntfyMessage.event !== 'message') {
                        return;
                    }
                    const newState = await extractStateFromMessage(ntfyMessage);
                    if (newState && isComponentMounted) {
                        setLiveState(newState);
                        setConnectionStatus('live');
                    }
                } catch (e) {
                    console.error("Failed to parse state update:", e);
                }
            };

            eventSource.onerror = (err) => {
                console.error("EventSource failed:", err);
                eventSource.close();

                if (isComponentMounted) {
                    setConnectionStatus('connecting');
                    // Attempt to reconnect after 3 seconds
                    reconnectTimeoutRef.current = window.setTimeout(() => {
                        console.log("Attempting to reconnect...");
                        connectSSE();
                    }, 3000);
                }
            };
        };

        fetchInitialState();
        connectSSE();

        return () => {
            isComponentMounted = false;
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [sessionId]);

    const renderContent = () => {
        if (!liveState) {
            return (
                <div className="text-center py-20 max-w-2xl mx-auto">
                    <div className="mb-6">
                        <svg className="mx-auto h-16 w-16 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-300 mb-3">Ootan andmeid...</h2>
                    <div className="bg-gray-800/50 rounded-lg p-6 text-left space-y-3">
                        <p className="text-gray-400">
                            {connectionStatus === 'live'
                                ? '✓ Ühendus aktiivne. Ootan esimest uuendust...'
                                : connectionStatus === 'connecting'
                                ? '⟳ Ühendan serveriga...'
                                : '⚠ Ühendus katkes. Proovin uuesti...'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            Kui administraator on võistluse alustanud, näed tulemusi koheselt.
                            Kui midagi ei ilmu, veendu, et oled õigel lehel või proovi lehte värskendada.
                        </p>
                    </div>
                </div>
            );
        }

        const { phase, competitionParticipants, bracket, thirdPlaceMatch, standings, competitionsHeld } = liveState;

        return (
            <div className="space-y-8">
                { (phase === AppPhase.QUALIFICATION || phase === AppPhase.BRACKET || phase === AppPhase.FINISHED) && 
                    <LiveQualificationResults participants={competitionParticipants} />
                }
                { (phase === AppPhase.BRACKET || phase === AppPhase.FINISHED) && 
                    <TournamentBracket
                        participants={competitionParticipants}
                        bracketData={bracket}
                        thirdPlaceMatch={thirdPlaceMatch}
                        onSetWinner={() => {}} // Read-only, so no-op
                        phase={phase}
                        onReturnToChampionship={() => {}} // Not applicable
                        isReadOnly={true}
                    />
                }
                { (phase === AppPhase.CHAMPIONSHIP_VIEW || phase === AppPhase.FINISHED) &&
                    <LiveStandingsTable standings={standings} competitionsHeld={competitionsHeld} />
                }
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
            <LiveStatusIndicator status={connectionStatus} />
             <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                    Salajase pleistaühingu DMEC - Tulemused
                </h1>
            </header>
            <main>
                {renderContent()}
            </main>
        </div>
    );
};

export default LiveResultsView;
