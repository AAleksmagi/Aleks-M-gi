import React, { useState, useEffect } from 'react';
import type { Participant, AppState } from '../types';

interface ScoreSubmissionPageProps {
  sessionId: string;
}

const ScoreSubmissionPage: React.FC<ScoreSubmissionPageProps> = ({ sessionId }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [score, setScore] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const eventSource = new EventSource(`https://ntfy.sh/${sessionId}/sse`);

    const handleStateUpdate = (event: MessageEvent) => {
      try {
        const ntfyMessage = JSON.parse(event.data);
        if (ntfyMessage.title === 'AppStateUpdate') {
          const state: AppState = JSON.parse(ntfyMessage.message);
          // We only want participants who haven't submitted a score yet
          const availableParticipants = state.competitionParticipants.filter(p => p.score === null);
          setParticipants(availableParticipants);
          setIsConnecting(false);
        }
      } catch (e) {
        console.error("Failed to parse state update:", e);
        setError("Andmete laadimisel tekkis viga.");
      }
    };
    
    eventSource.onmessage = handleStateUpdate;
    eventSource.onerror = (err) => {
        console.error("ScoreSubmissionPage EventSource failed. Event:", err);
        setError("Ühendus serveriga katkes. Värskenda lehte.");
        setIsConnecting(false);
        eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId || !score) {
      setError('Palun vali oma nimi ja sisesta tulemus.');
      return;
    }

    const scoreValue = parseInt(score, 10);
    if (isNaN(scoreValue) || scoreValue < 0) {
      setError('Palun sisesta sobiv positiivne number.');
      return;
    }
    
    const submissionData = {
        participantId: parseInt(selectedParticipantId, 10),
        score: scoreValue
    };

    try {
        await fetch(`https://ntfy.sh/${sessionId}`, {
            method: 'POST',
            body: JSON.stringify(submissionData),
            headers: {
                'Title': 'ScoreSubmission',
                'Tags': 'scoreboard'
            }
        });
        setIsSubmitted(true);
        setError('');
    } catch (fetchError) {
        console.error("Failed to send score submission:", fetchError);
        setError("Tulemuse saatmine ebaõnnestus. Proovi uuesti.");
    }
  };

  if (isConnecting) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-xl text-gray-400">Ühendan võistlusega...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl shadow-2xl text-center">
        {isSubmitted ? (
          <div>
            <svg className="mx-auto h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-bold text-white mt-4">Tulemus saadetud!</h1>
            <p className="text-gray-400 mt-2">Sinu kvalifikatsiooni tulemus on edastatud. Täname!</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-yellow-300 mb-2">Sisesta kvalifikatsiooni tulemus</h1>
            <p className="text-gray-400 mb-8">Vali oma nimi ja sisesta parim tulemus.</p>
            {participants.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="participant-select" className="sr-only">Vali osaleja</label>
                  <select
                    id="participant-select"
                    value={selectedParticipantId}
                    onChange={(e) => setSelectedParticipantId(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="" disabled>Vali oma nimi...</option>
                    {participants.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="score-input" className="sr-only">Tulemus</label>
                  <input
                    id="score-input"
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Sinu tulemus"
                    className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                    min="0"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition duration-300 shadow-lg"
                >
                  Saada tulemus
                </button>
              </form>
            ) : (
                <p className="text-gray-400">Kõik osalejad on oma tulemuse sisestanud või ootel osalejaid pole.</p>
            )}
            
          </>
        )}
      </div>
    </div>
  );
};

export default ScoreSubmissionPage;