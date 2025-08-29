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


const ChampionshipView: React.FC<ChampionshipViewProps> = ({ 
    standings, 
    setStandings, 
    onStartCompetition, 
    totalCompetitions, 
    setTotalCompetitions, 
    competitionsHeld, 
    onResetChampionship 
}) => {
    const [newName, setNewName] = useState('');
    const [seasonLengthInput, setSeasonLengthInput] = useState('');

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
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-yellow-300">
                    {isSeasonFinished ? 'Hooaja lõplik edetabel' : 'Meistrivõistluste edetabel'}
                </h2>
                <div className="text-lg font-semibold text-gray-400 bg-gray-700 px-4 py-1 rounded-md">
                   Võistlus {Math.min(competitionsHeld + 1, totalCompetitions)} / {totalCompetitions}
                </div>
            </div>

            {isSeasonFinished ? (
                <div className="text-center">
                    {sortedStandings.length > 0 && (
                         <div className="flex justify-center items-end gap-4 my-8">
                            {second && (
                                <div className="flex flex-col items-center opacity-0 animate-podium-item" style={{ animationDelay: '0.4s' }}>
                                    <div className="text-4xl">🥈</div>
                                    <div className="font-bold text-xl text-gray-300 mt-1">{second.name}</div>
                                    <div className="text-lg text-yellow-400">{getTotalPoints(second)} punkti</div>
                                    <div className="bg-gray-600 w-28 md:w-32 h-24 rounded-t-lg flex items-center justify-center text-2xl font-bold mt-2">2.</div>
                                </div>
                            )}
                            {first && (
                                <div className="flex flex-col items-center opacity-0 animate-podium-item" style={{ animationDelay: '0.6s' }}>
                                    <div className="text-5xl">🥇</div>
                                    <div className="font-bold text-2xl text-yellow-300 mt-1">{first.name}</div>
                                    <div className="text-xl text-yellow-200">{getTotalPoints(first)} punkti</div>
                                    <div className="bg-yellow-500 text-gray-900 w-32 md:w-40 h-32 rounded-t-lg flex items-center justify-center text-3xl font-bold mt-2">1.</div>
                                </div>
                            )}
                            {third && (
                                <div className="flex flex-col items-center opacity-0 animate-podium-item" style={{ animationDelay: '0.2s' }}>
                                    <div className="text-4xl">🥉</div>
                                    <div className="font-bold text-xl mt-1" style={{ color: '#CD7F32' }}>{third.name}</div>
                                    <div className="text-lg" style={{ color: '#A36A3B' }}>{getTotalPoints(third)} punkti</div>
                                    <div className="w-28 md:w-32 h-20 rounded-t-lg flex items-center justify-center text-2xl font-bold mt-2" style={{ backgroundColor: '#8C5A2B' }}>3.</div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 opacity-0 animate-podium-item overflow-x-auto" style={{ animationDelay: '0.8s' }}>
                        {standings.length > 0 && <hr className="border-gray-600 my-6" />}
                        <table className="w-full min-w-max">
                            <TableHeader/>
                            <tbody>
                                {sortedStandings.map((p, index) => <TableRow key={p.id} p={p} index={index} />)}
                            </tbody>
                        </table>
                         {standings.length === 0 && (
                            <p className="text-center text-gray-400 py-4">Hooaeg on lõppenud.</p>
                         )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                            placeholder="Sisesta osaleja nimi sarja lisamiseks"
                            className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <button
                            onClick={addParticipant}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
                        >
                            Lisa osaleja
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        {standings.length > 0 ? (
                            <table className="w-full min-w-max">
                                <TableHeader />
                                <tbody>
                                    {sortedStandings.map((p, index) => <TableRow key={p.id} p={p} index={index} />)}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-400 py-4">
                               Lisa osalejaid, et alustada meistrivõistlusi.
                            </p>
                        )}
                    </div>
                </>
            )}

            <div className="mt-8 text-center">
                {isSeasonFinished ? (
                    <button
                        onClick={onResetChampionship}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition duration-300 shadow-lg opacity-0 animate-podium-item"
                        style={{ animationDelay: '1.0s' }}
                    >
                        Alusta uut hooaega
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onStartCompetition}
                            disabled={standings.length < 2}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-xl transition duration-300 shadow-lg"
                        >
                            Alusta uut võistlust
                        </button>
                        {standings.length < 2 && <p className="text-sm mt-2 text-gray-500">Võistluse alustamiseks on vaja vähemalt 2 osalejat.</p>}
                    </>
                )}
            </div>
        </div>
    );
};

export default ChampionshipView;