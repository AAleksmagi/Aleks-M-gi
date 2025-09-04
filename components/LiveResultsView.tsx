import React, { useState, useEffect, useMemo } from 'react';
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

    useEffect(() => {
        const eventSource = new EventSource(`https://ntfy.sh/${sessionId}/sse`);

        eventSource.onopen = () => {
            setConnectionStatus('connecting');
        };
        
        eventSource.onmessage = (event) => {
            try {
                const ntfyMessage = JSON.parse(event.data);
                if (ntfyMessage.title === 'AppStateUpdate') {
                    const newState: AppState = JSON.parse(ntfyMessage.message);
                    setLiveState(newState);
                    setConnectionStatus('live');
                }
            } catch (e) {
                console.error("Failed to parse state update:", e);
            }
        };

        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            setConnectionStatus('error');
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [sessionId]);

    const renderContent = () => {
        if (!liveState) {
            return (
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-400">Ootan andmeid...</h2>
                    <p className="text-gray-500">Veendu, et administraator on võistluse alustanud.</p>
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
