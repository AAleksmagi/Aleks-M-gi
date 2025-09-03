import React, { useState } from 'react';
import type { ChampionshipStanding } from '../types';

interface RegistrationState {
  standings: ChampionshipStanding[];
  competitionsHeld: number;
}

interface RegistrationPageProps {
  initialState: RegistrationState;
  sessionId: string;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ initialState, sessionId }) => {
  const [name, setName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nimi on kohustuslik.');
      return;
    }

    const trimmedName = name.trim();
    const isAlreadyRegistered = initialState.standings.some(
      p => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isAlreadyRegistered) {
      setError('See nimi on juba registreeritud.');
      return;
    }

    const newParticipant: ChampionshipStanding = {
      id: Date.now(),
      name: trimmedName,
      pointsPerCompetition: Array(initialState.competitionsHeld).fill(0),
    };

    const newParticipantJson = JSON.stringify(newParticipant);
    
    try {
        await fetch(`https://ntfy.sh/dmec-${sessionId}`, {
            method: 'POST',
            body: newParticipantJson,
        });
    } catch (fetchError) {
        console.error("Failed to send registration update:", fetchError);
        setError("Registreerimine ebaõnnestus võrguvea tõttu. Proovi uuesti.");
        return;
    }
    
    setIsRegistered(true);
    setError('');

    // Clean up the URL for a better user experience after registration
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl shadow-2xl text-center">
        {isRegistered ? (
          <div>
            <svg className="mx-auto h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-bold text-white mt-4">Edukalt registreeritud!</h1>
            <p className="text-gray-400 mt-2">Sinu nimi on lisatud võistluse nimekirja. Edu!</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-yellow-300 mb-2">Võistlusele registreerimine</h1>
            <p className="text-gray-400 mb-8">Sisesta oma nimi, et osalejate nimekirjaga liituda.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Sinu nimi"
                className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label="Participant Name"
                autoFocus
              />
              {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-xl transition duration-300 shadow-lg"
              >
                Registreeri
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RegistrationPage;
