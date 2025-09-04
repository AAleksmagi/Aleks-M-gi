import React, { useState } from 'react';
import type { ChampionshipStanding } from '../types';

interface ChampionshipViewProps {
  standings: ChampionshipStanding[];
  setStandings: React.Dispatch<React.SetStateAction<ChampionshipStanding[]>>;
  onStartCompetition: () => void;
  totalCompetitions: number | null;
  setTotalCompetitions: (count: number) => void;
  competitionsHeld: number;
  onResetChampionship: () => void;
  registrationSessionId: string | null;
  onEnableRegistration: () => void;
}

const PointsTable: React.FC<{ title: string; data: Record<string, string | number> }> = ({ title, data }) => (
    <div className="w-full">
        <h3 className="text-lg font-bold text-blue-300 mb-3 text-center">{title}</h3>
        <table className="w-full text-sm text-left text-gray-300 bg-gray-700/50 rounded-lg overflow-hidden">
            <thead className="bg-gray-700 text-xs text-gray-400 uppercase">
                <tr>
                    <th scope="col" className="px-4 py-2">Koht</th>
                    <th scope="col" className="px-4 py-2 text-right">Punktid</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(data).map(([rank, points]) => (
                    <tr key={rank} className="border-b border-gray-700">
                        <td className="px-4 py-1 font-medium">{rank}</td>
                        <td className="px-4 py-1 text-right font-semibold text-yellow-400">{points}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


export const ChampionshipView: React.FC<ChampionshipViewProps> = ({ 
    standings, 
    setStandings, 
    onStartCompetition, 
    totalCompetitions, 
    setTotalCompetitions, 
    competitionsHeld, 
    onResetChampionship,
    registrationSessionId,
    onEnableRegistration
}) => {
    const [newName, setNewName] = useState('');
    const [seasonLengthInput, setSeasonLengthInput] = useState(totalCompetitions?.toString() || '');
    const [linkCopied, setLinkCopied] = useState(false);

    const registrationLink = registrationSessionId 
        ? `${window.location.origin}${window.location.pathname}?session=${registrationSessionId}`
        : '';
        
    const copyLink = () => {
        navigator.clipboard.writeText(registrationLink).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        });
    };

    const addParticipant = () => {
        if (newName.trim()) {
            const newParticipant: ChampionshipStanding = {
                id: Date.now(),
                name: newName.trim(),
                pointsPerCompetition: Array(competitionsHeld).fill(0),
            };
            setStandings(prev => [...prev, newParticipant]);
            setNewName('');
        }
    };

    const removeParticipant = (id: number) => {
        setStandings(prev => prev.filter(p => p.id !== id));
    };

    const handleSetSeasonLength = () => {
        const length = parseInt(seasonLengthInput, 10);
        if (length > 0) {
            setTotalCompetitions(length);
        }
    };

    if (totalCompetitions === null) {
        const qualificationPointsData = {
            "1.": 12, "2.": 10, "3.": 8, "4.": 6,
            "5.-6.": 4, "7.-8.": 3, "9.-12.": 2, "13.-16.": 1,
            "17.-24.": 0.5, "25.-32.": 0.25,
        };
        const mainCompetitionPointsData = {
            "1.": 100, "2.": 88, "3.": 76, "4.": 64,
            "5.-8.": 48, "9.-16.": 32, "17.-32.": 16, "33.-64.": 10,
        };

        return (
             <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-yellow-300">Hooaja seadistamine</h2>
                    <p className="text-gray-400 mb-6">Mitu võistlust kuulub selle hooaja meistrivõistluste arvestusse?</p>
                     <div className="flex gap-4 max-w-sm mx-auto">
                        <input
                            type="number"
                            value={seasonLengthInput}
                            onChange={(e) => setSeasonLengthInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetSeasonLength()}
                            placeholder="Võistluste arv"
                            className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            min="1"
                        />
                        <button
                            onClick={handleSetSeasonLength}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
                        >
                            Määra
                        </button>
                    </div>
                </div>
                
                <hr className="border-gray-700 my-8" />

                <div className="flex flex-col md:flex-row gap-8">
                    <PointsTable title="Kvalifikatsiooni punktid" data={qualificationPointsData} />
                    <PointsTable title="Põhivõistluse punktid" data={mainCompetitionPointsData} />
                </div>
            </div>
        );
    }
    
    const isSeasonFinished = competitionsHeld >= totalCompetitions;
    const sortedStandings = [...standings].sort((a, b) => {
        const totalA = a.pointsPerCompetition.reduce((sum, p) => sum + p, 0);
        const totalB = b.pointsPerCompetition.reduce((sum, p) => sum + p, 0);
        return totalB - totalA;
    });

    const [first, second, third] = sortedStandings;

    const getTotalPoints = (p: ChampionshipStanding) => p.pointsPerCompetition.reduce((sum, pts) => sum + pts, 0);

    const TableHeader = () => (
        <thead className="bg-gray-700/50">
            <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-400 tracking-wider w-16">Koht</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-400 tracking-wider">Nimi</th>
                {Array.from({ length: competitionsHeld }, (_, i) => (
                    <th key={i} className="p-3 text-center text-sm font-semibold text-gray-400 tracking-wider w-24">Etapp {i + 1}</th>
                ))}
                <th className="p-3 text-center text-sm font-semibold text-yellow-300 tracking-wider w-24">Kokku</th>
                {!isSeasonFinished && <th className="w-12 p-3"></th>}
            </tr>
        </thead>
    );

    const TableRow = ({ p, index }: { p: ChampionshipStanding; index: number }) => (
        <tr className="border-b border-gray-700 hover:bg-gray-700/50">
            <td className="p-3 font-bold text-center">{index + 1}.</td>
            <td className="p-3 font-semibold">{p.name}</td>
            {Array.from({ length: competitionsHeld }, (_, i) => (
                <td key={i} className="p-3 text-center text-gray-400">{p.pointsPerCompetition[i] ?? 0}</td>
            ))}
            <td className="p-3 text-center font-bold text-yellow-400">{getTotalPoints(p)}</td>
            {!isSeasonFinished && (
                <td className="p-3 text-center">
                    <button
                        onClick={() => removeParticipant(p.id)}
                        className="text-red-500 hover:text-red-400 font-bold"
                        title="Eemalda osaleja sarjast"
                    >
                        X
                    </button>
                </td>
            )}
        </tr>
    );

    return (
        <div className="max-w-7xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                 <h2 className="text-2xl font-bold text-yellow-300">
                    Edetabel - Etapp {isSeasonFinished ? totalCompetitions : competitionsHeld + 1}/{totalCompetitions}
                 </h2>
                 {!isSeasonFinished && (
                    <button 
                        onClick={onStartCompetition} 
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                        disabled={standings.length < 2}
                    >
                        Alusta võistlust
                    </button>
                 )}
            </div>

            {isSeasonFinished && (
                <div className="text-center p-8 bg-gray-900/50 rounded-lg mb-8 border border-yellow-500">
                    <h3 className="text-3xl font-bold text-yellow-400 mb-6">Hooaeg on lõppenud!</h3>
                    <div className="flex justify-center items-end gap-4">
                        {second && (
                            <div className="text-center">
                                <div className="text-5xl">🥈</div>
                                <div className="font-bold text-xl mt-2 text-gray-300">{second.name}</div>
                                <div className="text-gray-400">{getTotalPoints(second)}p</div>
                            </div>
                        )}
                        {first && (
                             <div className="text-center mx-4">
                                <div className="text-6xl">🏆</div>
                                <div className="font-bold text-2xl mt-2 text-yellow-300">{first.name}</div>
                                <div className="text-yellow-400">{getTotalPoints(first)}p</div>
                            </div>
                        )}
                        {third && (
                            <div className="text-center">
                                <div className="text-5xl" style={{ filter: 'saturate(0.8)' }}>🥉</div>
                                <div className="font-bold text-xl mt-2" style={{ color: '#CD7F32' }}>{third.name}</div>
                                <div className="text-gray-400">{getTotalPoints(third)}p</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="w-full text-left">
                    <TableHeader />
                    <tbody>
                        {sortedStandings.map((p, index) => <TableRow key={p.id} p={p} index={index} />)}
                    </tbody>
                </table>
            </div>

            {!isSeasonFinished && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-blue-300">Halda osalejaid</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <p className="mb-2 text-gray-400">Lisa uus osaleja</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                                    placeholder="Osaleja nimi"
                                    className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={addParticipant}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
                                >
                                    Lisa
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-gray-400">Luba uutel osalejatel liituda lingi kaudu</p>
                            {registrationSessionId ? (
                                <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-lg">
                                    <input
                                        type="text"
                                        readOnly
                                        value={registrationLink}
                                        className="flex-grow bg-gray-900 text-gray-300 border border-gray-600 rounded-md px-3 py-2 text-sm"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                                    >
                                        {linkCopied ? 'Kopeeritud!' : 'Kopeeri'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={onEnableRegistration}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                                >
                                    Luba registreerimine
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-10 pt-6 border-t border-gray-700 text-center">
                <button
                    onClick={onResetChampionship}
                    className="text-gray-400 hover:text-white border border-gray-600 hover:border-red-500 hover:bg-red-500/20 py-2 px-4 rounded-md transition duration-300 text-sm"
                >
                    Alusta uut hooaega (kustutab kõik andmed)
                </button>
            </div>
        </div>
    );
};
