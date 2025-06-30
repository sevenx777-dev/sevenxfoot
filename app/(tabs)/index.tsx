import React, { useState, useReducer, useEffect, createContext, useContext, useMemo, FC } from 'react';
import { useWindowDimensions } from 'react-native';

// --- Ícones para a Web ---
import {
    Users, Trophy, DollarSign, Calendar, TrendingUp, Target, Shield,
    Star, User, PlayCircle, RefreshCw, Mail, Briefcase, XCircle, LogIn, LogOut, Save,
    BarChart, Crosshair, Shirt, Zap, PlusCircle, LucideIcon, LoaderCircle, Wrench, Upload, Send
} from 'lucide-react';


// =================================================================================
// --- SEÇÃO 1: CONSTANTES E TIPOS ---
// =================================================================================

const initialGameConstants = {
    PLAYER_AGE_MIN: 18,
    PLAYER_AGE_MAX: 34,
    PLAYER_OVERALL_MIN: 45,
    PLAYER_OVERALL_MAX: 60,
    PLAYER_POTENTIAL_MAX_BONUS: 20,
    CHANCE_RECEBER_OFERTA_IA: 0.3,
    CHANCE_OFERTA_SAIDA_ACEITE_NORMAL: 0.6,
    CHANCE_OFERTA_SAIDA_ACEITE_ALTA: 0.9,
    CHANCE_EVOLUCAO_JOVEM: 0.15,
    CHANCE_REGRESSAO_VELHO: 0.08,
    CHANCE_REGRESSAO_MUITO_VELHO: 0.20,
    PREMIO_CAMPEAO_LIGA: 10000000,
    SALARY_WEEKLY_DIVISOR: 52,
};

const NAMES = ["Silva", "Santos", "Costa", "Lima", "Oliveira", "Ferreira", "Alves", "Gomes", "Martins", "Souza", "Pereira", "Rodrigues"];
const FIRST_NAMES = ["João", "Carlos", "Felipe", "Roberto", "André", "Lucas", "Ricardo", "Bruno", "Pedro", "Vinícius", "Eduardo", "Gabriel"];

const initialTeamsDB: Team[] = [
    { id: 1, name: 'FC Santos', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/VHdNOT6_dN9ge26dO2YCvQ_96x96.png' },
    { id: 2, name: 'Flamengo', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/orE554NToSkH6nuwofe7Yg_96x96.png' },
    { id: 3, name: 'Palmeiras', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/7sp___w-4D2c-oE_3l6iSA_96x96.png' },
    { id: 4, name: 'São Paulo', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/1w_4_Jff0xA4MOC123M2kg_96x96.png' }
];

type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
type Formation = '4-4-2' | '4-3-3' | '5-3-2';

type Player = {
    id: number; name: string; teamId: number; teamName: string; position: PlayerPosition; age: number;
    overall: number; potential: number; salary: number; contract: number; morale: number; energy: number;
    photoUrl?: string; goals: number; assists: number; yellowCards: number; redCards: number;
    injuryDuration: number; suspensionDuration: number; value: number; isForSale: boolean;
};

type Team = { id: number; name: string; logoUrl?: string; };
type TeamStanding = Team & { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; gd: number; points: number; overall: number; };

type TransferOfferPayload = { offerId: number; playerId: number; playerName: string; amount: number; offeringTeamName: string; };
type GameMessage = {
    id: number; week: number; read: boolean;
} & (
    | { type: 'finance' | 'contract' | 'result' | 'evolution' | 'award'; title: string; body: string; payload?: never; }
    | { type: 'transfer_offer_incoming'; title: string; body: string; payload: TransferOfferPayload; }
    | { type: 'transfer_offer_outgoing_accepted' | 'transfer_offer_outgoing_rejected'; title: string; body: string; payload: TransferOfferPayload; }
);

type NotificationPayload = { show: boolean; title: string; message: string; };
type Match = { week: number; homeTeamId: number; awayTeamId: number; };
type TransferOffer = {
    playerId: number; playerName: string; offeringTeamId: number; offeringTeamName: string;
    amount: number; status: 'pending' | 'accepted' | 'rejected'; isIncoming: boolean; week: number;
};

type GameConstantsType = typeof initialGameConstants;

type PublishedPatch = {
    id: number;
    author: string;
    version: string;
    data: {
        teams: Team[],
        players: Player[],
        constants: GameConstantsType
    }
};

type GameState = {
    status: 'main-menu' | 'playing';
    managerName: string;
    season: number;
    week: number;
    isSimulating: boolean;
    club: { id: number; name: string; money: number; reputation: number; morale: number; formation: Formation; };
    standings: TeamStanding[];
    leaguePlayers: Player[];
    messages: GameMessage[];
    schedule: Match[];
    database: {
        teams: Team[];
        constants: GameConstantsType;
    };
    matchResult: { show: boolean; homeTeam: TeamStanding; awayTeam: TeamStanding; homeScore: number; awayScore: number; } | null;
    notification: NotificationPayload | null;
    transferOffers: TransferOffer[];
    transferMarketPlayers: Player[];
    communityPatches: PublishedPatch[];
};

type Action =
    | { type: 'START_GAME'; payload: { managerName: string; selectedTeamId: number; } }
    | { type: 'LOAD_GAME'; payload: GameState }
    | { type: 'RESET_GAME' }
    | { type: 'START_SIMULATION' }
    | { type: 'PROCESS_WEEKLY_EVENTS'; payload: { newStandings: TeamStanding[]; matchResult: GameState['matchResult']; weeklyMessages: Omit<GameMessage, 'id' | 'read'>[]; newClubMoney: number; newClubMorale: number; updatedPlayers: Player[]; updatedMarket: Player[]; newWeek: number; newTransferOffers: TransferOffer[]; season?: number; } }
    | { type: 'MARK_MESSAGE_AS_READ'; payload: number }
    | { type: 'SET_FORMATION'; payload: Formation }
    | { type: 'SHOW_NOTIFICATION'; payload: { title: string; message: string; } }
    | { type: 'HIDE_NOTIFICATION' }
    | { type: 'CLOSE_MODAL' }
    | { type: 'ACCEPT_TRANSFER_OFFER_INCOMING'; payload: { playerId: number; } }
    | { type: 'REJECT_TRANSFER_OFFER_INCOMING'; payload: { playerId: number; } }
    | { type: 'MAKE_TRANSFER_OFFER_OUTGOING'; payload: { playerId: number; amount: number; } }
    | { type: 'LIST_PLAYER_FOR_SALE'; payload: { playerId: number; isForSale: boolean; } }
    | { type: 'APPLY_PATCH'; payload: { teams: Team[], players: Player[], constants: GameConstantsType } }
    | { type: 'PUBLISH_PATCH'; payload: Omit<PublishedPatch, 'id'> }
    | { type: 'SET_COMMUNITY_PATCHES'; payload: PublishedPatch[] };

// =================================================================================
// --- SEÇÃO 2: GAME & AUTH CONTEXT ---
// =================================================================================
type AuthUser = {
    id: number;
    email: string;
};

type AuthContextType = {
    currentUser: AuthUser | null;
    login: (user: AuthUser) => void;
    logout: () => void;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

type GameContextType = {
    state: GameState;
    dispatch: React.Dispatch<Action>;
    simulateWeek: () => void;
    handleMakeOffer: (playerId: number, playerName: string, amount: number) => void;
    handleAcceptIncomingOffer: (playerId: number) => void;
    handleRejectIncomingOffer: (playerId: number) => void;
    handleListForSale: (playerId: number, isForSale: boolean) => void;
};
const GameContext = createContext<GameContextType | undefined>(undefined);
const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
};

// =================================================================================
// --- SEÇÃO 3: FUNÇÕES UTILITÁRIAS E GERADORES ---
// =================================================================================
let playerIdCounter = 1;
const generatePlayer = (teamId: number, teamName: string, position: PlayerPosition, constants: GameConstantsType): Player => {
    const age = Math.floor(Math.random() * (constants.PLAYER_AGE_MAX - constants.PLAYER_AGE_MIN + 1)) + constants.PLAYER_AGE_MIN;
    const overall = Math.floor(Math.random() * (constants.PLAYER_OVERALL_MAX - constants.PLAYER_OVERALL_MIN + 1)) + constants.PLAYER_OVERALL_MIN;
    const potential = Math.min(95, overall + Math.floor(Math.random() * constants.PLAYER_POTENTIAL_MAX_BONUS));
    const baseSalary = Math.floor((overall / 10) * 5000);
    const value = Math.max(100000, Math.floor(baseSalary * 10 + (potential - overall) * 50000 + Math.random() * 100000));
    return {
        id: playerIdCounter++, name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${NAMES[Math.floor(Math.random() * NAMES.length)]}`,
        teamId, teamName, position, age, overall, potential, salary: baseSalary, contract: 2025 + Math.floor(Math.random() * 4),
        morale: 80, energy: 100, goals: 0, assists: 0, yellowCards: 0, redCards: 0, injuryDuration: 0, suspensionDuration: 0,
        photoUrl: `https://i.pravatar.cc/150?u=${playerIdCounter}`, value, isForSale: false,
    };
};
const generateLeaguePlayers = (teams: Team[], constants: GameConstantsType): Player[] => {
    const players: Player[] = [];
    teams.forEach(team => {
        players.push(generatePlayer(team.id, team.name, 'GOL', constants));
        for (let i = 0; i < 4; i++) players.push(generatePlayer(team.id, team.name, i < 2 ? 'ZAG' : 'LAT', constants));
        for (let i = 0; i < 3; i++) players.push(generatePlayer(team.id, team.name, i < 2 ? 'VOL' : 'MEI', constants));
        for (let i = 0; i < 3; i++) players.push(generatePlayer(team.id, team.name, 'ATA', constants));
    });
    return players;
};
const generateSchedule = (teams: Team[]): Match[] => {
    const schedule: Match[] = [];
    const teamList = [...teams];
    if (teamList.length % 2 !== 0) teamList.push({ id: -1, name: "BYE", logoUrl: '' });
    const rounds = teamList.length - 1;
    for (let round = 0; round < rounds; round++) {
        for (let match = 0; match < teamList.length / 2; match++) {
            const home = (round + match) % (teamList.length - 1);
            let away = (teamList.length - 1 - match + round) % (teamList.length - 1);
            if (match === 0) away = teamList.length - 1;
            schedule.push({ week: round + 1, homeTeamId: teamList[home].id, awayTeamId: teamList[away].id });
        }
    }
    const secondTurn = schedule.map(m => ({ week: m.week + rounds, homeTeamId: m.awayTeamId, awayTeamId: m.homeTeamId }));
    return [...schedule, ...secondTurn].filter(m => m.homeTeamId !== -1 && m.awayTeamId !== -1);
};
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const getMoraleDescription = (morale: number) => {
    if (morale >= 90) return { text: "Excelente", color: 'text-green-500' };
    if (morale >= 75) return { text: "Bom", color: 'text-green-500' };
    if (morale >= 60) return { text: "Médio", color: 'text-amber-500' };
    if (morale >= 40) return { text: "Baixo", color: 'text-red-500' };
    return { text: "Crítico", color: 'text-red-500' };
};
const getEnergyColor = (energy: number) => energy >= 80 ? 'bg-green-500' : energy >= 50 ? 'bg-amber-500' : 'bg-red-500';
const getPositionColor = (position: number) => {
    if (position <= 1) return { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-600' };
    if (position <= 4) return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-600' };
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' };
};

// =================================================================================
// --- SEÇÃO 4: ESTADO DO JOGO (REDUCER E ESTADO INICIAL) ---
// =================================================================================
const getInitialState = (): GameState => ({
    status: 'main-menu', managerName: '', season: 2025, week: 1, isSimulating: false,
    club: { id: 0, name: '', money: 15000000, reputation: 75, morale: 80, formation: '4-4-2' },
    leaguePlayers: [], standings: [], matchResult: null, messages: [], notification: null, schedule: [],
    database: { 
        teams: JSON.parse(JSON.stringify(initialTeamsDB)),
        constants: JSON.parse(JSON.stringify(initialGameConstants)) 
    },
    transferOffers: [], transferMarketPlayers: [],
    communityPatches: [],
});

const gameReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'START_GAME': {
            const allPlayers = generateLeaguePlayers(state.database.teams, state.database.constants);
            const playerTeam = state.database.teams.find(t => t.id === action.payload.selectedTeamId)!;
            const startMessage: GameMessage = { id: Date.now(), week: 1, type: 'result', title: `Bem-vindo ao ${playerTeam.name}!`, body: `Olá, ${action.payload.managerName}. A diretoria deseja-lhe sorte nesta nova temporada.`, read: false };
            const initialStandings = state.database.teams.map(team => ({
                ...team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0,
                overall: Math.floor(allPlayers.filter(p => p.teamId === team.id).reduce((acc, p) => acc + p.overall, 0) / allPlayers.filter(p => p.teamId === team.id).length)
            }));
            const marketPlayers: Player[] = Array.from({ length: 20 }, () => {
                const randomPosition = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'][Math.floor(Math.random() * 6)] as PlayerPosition;
                return generatePlayer(0, 'Agente Livre', randomPosition, state.database.constants);
            });
            return {
                ...getInitialState(), status: 'playing', managerName: action.payload.managerName, leaguePlayers: allPlayers, messages: [startMessage],
                club: { ...getInitialState().club, id: playerTeam.id, name: playerTeam.name }, standings: initialStandings,
                schedule: generateSchedule(state.database.teams), transferMarketPlayers: marketPlayers,
                communityPatches: state.communityPatches,
            };
        }
        case 'LOAD_GAME':
            return {
                ...action.payload,
                communityPatches: state.communityPatches,
            };
        case 'RESET_GAME': return { ...getInitialState(), communityPatches: state.communityPatches };
        case 'START_SIMULATION': return { ...state, isSimulating: true };
        case 'PROCESS_WEEKLY_EVENTS': {
            const { payload } = action;
            const newMessages = payload.weeklyMessages.map(m => ({ ...m, id: Date.now() + Math.random(), read: false })) as GameMessage[];
            return {
                ...state, isSimulating: false, week: payload.newWeek, standings: payload.newStandings,
                matchResult: payload.matchResult, club: { ...state.club, money: payload.newClubMoney, morale: payload.newClubMorale },
                leaguePlayers: payload.updatedPlayers, transferMarketPlayers: payload.updatedMarket,
                messages: [...newMessages, ...state.messages],
                transferOffers: payload.newTransferOffers, season: payload.season ?? state.season,
            };
        }
        case 'MARK_MESSAGE_AS_READ':
            return { ...state, messages: state.messages.map(m => m.id === action.payload ? { ...m, read: true } : m) };
        case 'SET_FORMATION':
            return { ...state, club: { ...state.club, formation: action.payload } };
        case 'SHOW_NOTIFICATION':
            return { ...state, notification: { show: true, ...action.payload } };
        case 'HIDE_NOTIFICATION':
            return { ...state, notification: null };
        case 'CLOSE_MODAL': return { ...state, matchResult: null };
        case 'ACCEPT_TRANSFER_OFFER_INCOMING': {
            const { playerId } = action.payload;
            const offerToAccept = state.transferOffers.find(o => o.isIncoming && o.status === 'pending' && o.playerId === playerId);
            if (!offerToAccept) return state;
            const updatedPlayers = state.leaguePlayers.map(p =>
                p.id === playerId ? { ...p, teamId: offerToAccept.offeringTeamId, teamName: offerToAccept.offeringTeamName, isForSale: false } : p
            );
            return {
                ...state,
                club: { ...state.club, money: state.club.money + offerToAccept.amount },
                leaguePlayers: updatedPlayers,
                transferOffers: state.transferOffers.filter(o => o.playerId !== playerId),
            };
        }
        case 'REJECT_TRANSFER_OFFER_INCOMING':
            return { ...state, transferOffers: state.transferOffers.filter(o => !(o.isIncoming && o.playerId === action.payload.playerId)) };
        case 'MAKE_TRANSFER_OFFER_OUTGOING': {
            const { playerId, amount } = action.payload;
            const playerToBuy = state.transferMarketPlayers.find(p => p.id === playerId);
            if (!playerToBuy || state.club.money < amount) return state;
            const outgoingOffer: TransferOffer = {
                playerId, playerName: playerToBuy.name, offeringTeamId: state.club.id,
                offeringTeamName: state.club.name, amount, status: 'pending', isIncoming: false, week: state.week,
            };
            return { ...state, transferOffers: [...state.transferOffers, outgoingOffer] };
        }
        case 'LIST_PLAYER_FOR_SALE':
            return { ...state, leaguePlayers: state.leaguePlayers.map(p => p.id === action.payload.playerId ? { ...p, isForSale: action.payload.isForSale } : p) };
        case 'APPLY_PATCH': {
            const { teams, players, constants } = action.payload;
            const newStandings = state.standings.map(st => {
                const updatedTeam = teams.find(t => t.id === st.id);
                return updatedTeam ? { ...st, name: updatedTeam.name, logoUrl: updatedTeam.logoUrl } : st;
            });
            return {
                ...state,
                leaguePlayers: players,
                database: {
                    ...state.database,
                    teams: teams,
                    constants: constants,
                },
                standings: newStandings
            };
        }
        case 'PUBLISH_PATCH': {
            const newPatch: PublishedPatch = {
                id: Date.now(),
                ...action.payload,
            };
            return {
                ...state,
                communityPatches: [...state.communityPatches, newPatch]
            }
        }
        case 'SET_COMMUNITY_PATCHES': {
            return { ...state, communityPatches: action.payload };
        }
        default: return state;
    }
};

// =================================================================================
// --- SEÇÃO 5: LÓGICA DO JOGO ---
// =================================================================================
const useGameLogic = (state: GameState, dispatch: React.Dispatch<Action>) => {
    const { database: { constants } } = state;

    const simulateMatch = (homePlayers: Player[], awayPlayers: Player[]) => {
        const homeOverall = homePlayers.length > 0 ? homePlayers.reduce((acc, p) => acc + p.overall, 0) / homePlayers.length : 1;
        const awayOverall = awayPlayers.length > 0 ? awayPlayers.reduce((acc, p) => acc + p.overall, 0) / awayPlayers.length : 1;
        const overallDifference = homeOverall - awayOverall + 5;
        let homeScore, awayScore;
        if (overallDifference > 10) { homeScore = Math.floor(Math.random() * 3) + 2; awayScore = Math.floor(Math.random() * 2); }
        else if (overallDifference > 0) { homeScore = Math.floor(Math.random() * 2) + 1; awayScore = Math.floor(Math.random() * 2); }
        else if (overallDifference > -10) { homeScore = Math.floor(Math.random() * 2); awayScore = Math.floor(Math.random() * 2) + 1; }
        else { homeScore = Math.floor(Math.random() * 2); awayScore = Math.floor(Math.random() * 3) + 2; }
        if (Math.abs(overallDifference) < 5 && Math.random() > 0.6) { const goals = Math.floor(Math.random() * 3); homeScore = goals; awayScore = goals; }
        return { homeScore, awayScore };
    };

    const processWeeklyPlayerUpdates = (players: Player[]) => {
        return players.map((p: Player) => {
            let newOverall = p.overall;
            if (p.age < 23 && p.potential > p.overall && Math.random() < constants.CHANCE_EVOLUCAO_JOVEM) newOverall++;
            else if (p.age > 30 && Math.random() < constants.CHANCE_REGRESSAO_VELHO) newOverall--;
            else if (p.age > 34 && Math.random() < constants.CHANCE_REGRESSAO_MUITO_VELHO) newOverall--;
            return {
                ...p,
                overall: newOverall,
                energy: Math.min(100, p.energy + 15),
                injuryDuration: Math.max(0, p.injuryDuration - 1),
                suspensionDuration: Math.max(0, p.suspensionDuration - 1),
            };
        });
    };

    const handleAITransferOffers = (players: Player[], clubId: number, teams: Team[], week: number) => {
        const offers: TransferOffer[] = [];
        const messages: Omit<GameMessage, 'id' | 'read'>[] = [];
        const playersForSale = players.filter((p: Player) => p.teamId === clubId && p.isForSale);
        for (const player of playersForSale) {
            if (Math.random() < constants.CHANCE_RECEBER_OFERTA_IA) {
                const interestedTeam = teams.filter((t: Team) => t.id !== clubId)[Math.floor(Math.random() * (teams.length - 1))];
                const offerAmount = Math.floor(player.value * (0.8 + Math.random() * 0.4));
                const incomingOffer: TransferOffer = {
                    playerId: player.id, playerName: player.name, offeringTeamId: interestedTeam.id,
                    offeringTeamName: interestedTeam.name, amount: offerAmount, status: 'pending', isIncoming: true, week,
                };
                offers.push(incomingOffer);
                messages.push({
                    week, type: 'transfer_offer_incoming', title: `Oferta por ${player.name}`,
                    body: `${interestedTeam.name} fez uma oferta de ${formatCurrency(offerAmount)}.`,
                    payload: { ...incomingOffer, offerId: player.id }
                });
            }
        }
        return { offers, messages };
    };

    const resolveOutgoingOffers = (offers: TransferOffer[], playersInMarket: Player[], currentPlayers: Player[], clubId: number, clubName: string, clubMoney: number, week: number) => {
        const messages: Omit<GameMessage, 'id' | 'read'>[] = [];
        let updatedPlayers = [...currentPlayers];
        let updatedMarket = [...playersInMarket];
        let updatedMoney = clubMoney;
        const remainingOffers: TransferOffer[] = [];

        for (const offer of offers) {
            if (offer.isIncoming) { remainingOffers.push(offer); continue; }
            if (offer.status !== 'pending') continue;
            const player = playersInMarket.find((p: Player) => p.id === offer.playerId);
            if (!player) continue;

            let accepted = (offer.amount >= player.value * 0.9 && Math.random() < constants.CHANCE_OFERTA_SAIDA_ACEITE_NORMAL) ||
                (offer.amount >= player.value * 1.1 && Math.random() < constants.CHANCE_OFERTA_SAIDA_ACEITE_ALTA);

            if (accepted) {
                updatedMarket = updatedMarket.filter((p: Player) => p.id !== player.id);
                updatedPlayers.push({ ...player, teamId: clubId, teamName: clubName, isForSale: false });
                updatedMoney -= offer.amount;
                messages.push({ week, type: 'transfer_offer_outgoing_accepted', title: `Oferta por ${player.name} Aceite!`, body: `${player.name} foi contratado!`, payload: { ...offer, offerId: player.id } });
            } else {
                messages.push({ week, type: 'transfer_offer_outgoing_rejected', title: `Oferta Rejeitada`, body: `A oferta por ${player.name} foi rejeitada.`, payload: { ...offer, offerId: player.id } });
            }
        }
        return { messages, updatedPlayers, updatedMarket, updatedMoney, remainingOffers };
    };

    const simulateWeek = () => {
        dispatch({ type: 'START_SIMULATION' });

        setTimeout(() => {
            let tempStandings = JSON.parse(JSON.stringify(state.standings));
            let tempPlayers = JSON.parse(JSON.stringify(state.leaguePlayers));
            let tempMarketPlayers = JSON.parse(JSON.stringify(state.transferMarketPlayers));
            const weeklyMessages: Omit<GameMessage, 'id' | 'read'>[] = [];
            let playerMatchResult: GameState['matchResult'] = null;
            let newClubMoney = state.club.money;
            let newClubMorale = state.club.morale;

            const totalSalaries = tempPlayers.filter((p: Player) => p.teamId === state.club.id).reduce((sum: number, p: Player) => sum + p.salary, 0);
            newClubMoney -= totalSalaries / constants.SALARY_WEEKLY_DIVISOR;
            weeklyMessages.push({ week: state.week, type: 'finance', title: 'Salários Semanais', body: `Pagamento de ${formatCurrency(totalSalaries / constants.SALARY_WEEKLY_DIVISOR)}.` });

            const matchesThisWeek = state.schedule.filter((m: Match) => m.week === state.week);
            for (const match of matchesThisWeek) {
                const homeTeam = tempStandings.find((t: TeamStanding) => t.id === match.homeTeamId)!;
                const awayTeam = tempStandings.find((t: TeamStanding) => t.id === match.awayTeamId)!;
                const homePlayers = tempPlayers.filter((p: Player) => p.teamId === homeTeam.id && p.injuryDuration === 0 && p.suspensionDuration === 0);
                const awayPlayers = tempPlayers.filter((p: Player) => p.teamId === awayTeam.id && p.injuryDuration === 0 && p.suspensionDuration === 0);

                [...homePlayers, ...awayPlayers].forEach((player: Player) => {
                    const playerRef = tempPlayers.find((p: Player) => p.id === player.id);
                    if (playerRef) playerRef.energy = Math.max(0, playerRef.energy - (Math.floor(Math.random() * 15) + 15));
                });

                const { homeScore, awayScore } = simulateMatch(homePlayers, awayPlayers);

                const outcome = homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw';
                tempStandings = tempStandings.map((t: TeamStanding) => {
                    if (t.id === homeTeam.id) return { ...t, played: t.played + 1, wins: t.wins + (outcome === 'win' ? 1 : 0), draws: t.draws + (outcome === 'draw' ? 1 : 0), losses: t.losses + (outcome === 'loss' ? 1 : 0), gf: t.gf + homeScore, ga: t.ga + awayScore, gd: (t.gf + homeScore) - (t.ga + awayScore), points: t.points + (outcome === 'win' ? 3 : outcome === 'draw' ? 1 : 0) };
                    if (t.id === awayTeam.id) return { ...t, played: t.played + 1, wins: t.wins + (outcome === 'loss' ? 1 : 0), draws: t.draws + (outcome === 'draw' ? 1 : 0), losses: t.losses + (outcome === 'win' ? 1 : 0), gf: t.gf + awayScore, ga: t.ga + homeScore, gd: (t.gf + awayScore) - (t.ga + homeScore), points: t.points + (outcome === 'loss' ? 3 : outcome === 'draw' ? 1 : 0) };
                    return t;
                });

                if (homeTeam.id === state.club.id || awayTeam.id === state.club.id) {
                    playerMatchResult = { show: true, homeTeam, awayTeam, homeScore, awayScore };
                    const moraleChange = (homeTeam.id === state.club.id && outcome === 'win') || (awayTeam.id === state.club.id && outcome === 'loss') ? 3 : outcome === 'draw' ? 1 : -4;
                    newClubMorale = Math.min(100, Math.max(0, newClubMorale + moraleChange));
                }
            }
            tempStandings.sort((a: TeamStanding, b: TeamStanding) => b.points - a.points || b.gd - a.gd);

            const offerResolution = resolveOutgoingOffers(state.transferOffers, tempMarketPlayers, tempPlayers, state.club.id, state.club.name, newClubMoney, state.week);
            newClubMoney = offerResolution.updatedMoney;
            tempPlayers = offerResolution.updatedPlayers;
            tempMarketPlayers = offerResolution.updatedMarket;
            weeklyMessages.push(...offerResolution.messages);
            let currentOffers = offerResolution.remainingOffers;

            const aiOffers = handleAITransferOffers(tempPlayers, state.club.id, state.database.teams, state.week);
            currentOffers.push(...aiOffers.offers);
            weeklyMessages.push(...aiOffers.messages);

            let updatedPlayers = processWeeklyPlayerUpdates(tempPlayers);

            let newWeek = state.week + 1;
            let season = state.season;

            if (state.week >= (state.database.teams.length - 1) * 2) {
                newWeek = 1;
                season++;
                const champion = tempStandings[0];
                weeklyMessages.push({ week: state.week, type: 'award', title: 'Fim da Temporada!', body: `A temporada ${state.season} chegou ao fim! O grande campeão foi ${champion.name}!` });
                if (champion.id === state.club.id) {
                    newClubMoney += constants.PREMIO_CAMPEAO_LIGA;
                    weeklyMessages.push({ week: state.week, type: 'finance', title: 'Prémio de Campeão!', body: `Você recebeu ${formatCurrency(constants.PREMIO_CAMPEAO_LIGA)}!` });
                }
                updatedPlayers = updatedPlayers.map((p: Player) => ({ ...p, goals: 0, assists: 0, age: p.age + 1, contract: p.contract > season ? p.contract : 0 }));
                tempStandings = tempStandings.map((t: TeamStanding) => ({ ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }));
            }

            dispatch({
                type: 'PROCESS_WEEKLY_EVENTS', payload: {
                    newStandings: tempStandings, matchResult: playerMatchResult, weeklyMessages,
                    newClubMoney, newClubMorale, updatedPlayers, updatedMarket: tempMarketPlayers, newWeek, newTransferOffers: currentOffers, season
                }
            });
        }, 1000);
    };

    return { simulateWeek };
};

// =================================================================================
// --- SEÇÃO 6: COMPONENTES DE UI ---
// =================================================================================

const ImageWithFallback: FC<{ src?: string; fallback: React.ReactNode; className: string }> = ({ src, fallback, className }) => {
    const [error, setError] = useState(false);
    useEffect(() => {
        setError(false);
    }, [src]);
    if (!src || error) { return <div className={`${className} flex items-center justify-center bg-gray-200`}>{fallback}</div>; }
    return <img src={src} onError={() => setError(true)} className={className} alt="" />;
};

const MainMenu: FC<{ onStartGame: (managerName: string, selectedTeamId: number) => void; onLoadGame: (state: GameState) => void; teams: Team[] }> = ({ onStartGame, onLoadGame, teams }) => {
    const { currentUser, login, logout } = useAuth();
    const [showLogin, setShowLogin] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [managerName, setManagerName] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState(teams[0].id);
    
    const handleAuthAction = async () => {
        if(isRegistering) {
            const success = await (window as any).dbService.registerUser(email, password);
            if (success) {
                alert('Registo efetuado com sucesso! Por favor, faça login.');
                setIsRegistering(false);
            } else {
                alert('Erro ao registar. O e-mail pode já estar em uso.');
            }
        } else {
            const user = await (window as any).dbService.loginUser(email, password);
            if (user) {
                login(user);
                setShowLogin(false);
            } else {
                alert('E-mail ou senha inválidos.');
            }
        }
    };
    
    const handleLoadGame = async () => {
        if(!currentUser) return;
        const savedGame = await (window as any).dbService.loadGame(currentUser.id);
        if(savedGame) {
            onLoadGame(savedGame);
        } else {
            alert("Nenhum jogo salvo encontrado para este utilizador.");
        }
    }

    const handleSubmitNewGame = () => { if (managerName.trim()) onStartGame(managerName, selectedTeamId); };
    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
                <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-700">
                    <h1 className="text-4xl font-bold text-center mb-2">Football Manager</h1>
                    <div className="text-center mb-8 h-6">
                        {currentUser ? (
                            <div className="flex items-center justify-center gap-4">
                                <p className="text-gray-300">Bem-vindo, {currentUser.email}!</p>
                                <button onClick={logout} className="text-indigo-400 hover:text-indigo-300 font-semibold">Logout</button>
                            </div>
                        ) : (
                             <button onClick={() => { setIsRegistering(false); setShowLogin(true); }} className="text-indigo-400 hover:text-indigo-300 font-semibold">Login para Salvar/Carregar</button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-center text-gray-400 border-b border-gray-700 pb-2">Novo Jogo</p>
                        <input type="text" placeholder="O seu nome de treinador" value={managerName} onChange={(e) => setManagerName(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <div className="relative">
                            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                               <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                            </div>
                        </div>
                        <button onClick={handleSubmitNewGame} disabled={!managerName.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            <PlayCircle size={20} />
                            <span>Iniciar Carreira</span>
                        </button>
                        <button onClick={handleLoadGame} disabled={!currentUser} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            <Upload size={20} />
                            <span>Carregar Jogo</span>
                        </button>
                    </div>
                </div>
            </div>
            <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} maxWidth="max-w-sm">
                <div className="p-6">
                    <div className="flex border-b mb-4">
                        <button onClick={() => setIsRegistering(false)} className={`flex-1 py-2 font-semibold ${!isRegistering ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Login</button>
                        <button onClick={() => setIsRegistering(true)} className={`flex-1 py-2 font-semibold ${isRegistering ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Registar</button>
                    </div>
                    <div className="space-y-4">
                        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                    </div>
                     <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setShowLogin(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold">Cancelar</button>
                        <button onClick={handleAuthAction} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">{isRegistering ? 'Registar' : 'Entrar'}</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

const Header = () => {
    const { state } = useGame();
    const { currentUser } = useAuth();
    const currentTeam = useMemo(() => state.standings.find(t => t.id === state.club.id), [state.standings, state.club.id]);
    const totalWeeks = (state.database.teams.length - 1) * 2;
    
    const saveGame = async () => {
        if (!currentUser) {
            alert("Precisa de fazer login para salvar o jogo.");
            return;
        }
        try {
            await (window as any).dbService.saveGame(currentUser.id, state);
            alert("Jogo salvo com sucesso!");
        } catch (error) {
            console.error("Failed to save game:", error);
            alert("Erro ao salvar o jogo.");
        }
    }

    return (
        <header className="bg-white shadow-md p-3 sm:p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <ImageWithFallback src={currentTeam?.logoUrl} fallback={<Shield size={24} className="text-gray-400" />} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full" />
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{state.club.name}</h2>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                            <User size={14} />
                            <span>{state.managerName}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-gray-600">Semana {state.week} / {totalWeeks}</p>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(state.week / totalWeeks) * 100}%` }}></div>
                        </div>
                    </div>
                    {currentUser && (
                         <button onClick={saveGame} className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors">
                            <Save size={16} />
                            <span className="hidden sm:inline">Salvar</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

const Modal: FC<{ children: React.ReactNode; isOpen: boolean; onClose: () => void; maxWidth?: string }> = ({ children, isOpen, onClose, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth}`} onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

const MatchResultModal: FC<{ result: GameState['matchResult'] | null; onClose: () => void }> = ({ result, onClose }) => {
    if (!result || !result.show) return null;
    const outcome = result.homeScore > result.awayScore ? 'win' : result.homeScore < result.awayScore ? 'loss' : 'draw';
    const stylesByOutcome = {
        win: { bg: 'bg-green-500', icon: <Star size={32} />, text: 'Vitória!' },
        loss: { bg: 'bg-red-500', icon: <XCircle size={32} />, text: 'Derrota' },
        draw: { bg: 'bg-amber-500', icon: <Shield size={32} />, text: 'Empate' }
    };
    const { bg, icon, text } = stylesByOutcome[outcome];

    return (
        <Modal isOpen={result.show} onClose={onClose}>
            <div className={`p-5 ${bg} text-white rounded-t-2xl flex justify-between items-center`}>
                <h3 className="text-2xl font-bold">{text}</h3>
                {icon}
            </div>
            <div className="p-6 space-y-4">
                <p className="text-center text-gray-500">Resultado Final</p>
                <div className="flex justify-around items-center">
                    <div className="text-center space-y-2 w-1/3">
                        <ImageWithFallback src={result.homeTeam.logoUrl} fallback={<Shield size={32} />} className="w-16 h-16 mx-auto object-contain" />
                        <p className="font-semibold text-gray-800">{result.homeTeam.name}</p>
                    </div>
                    <p className={`text-4xl font-bold ${bg} text-white px-4 py-2 rounded-lg`}>{result.homeScore} - {result.awayScore}</p>
                    <div className="text-center space-y-2 w-1/3">
                        <ImageWithFallback src={result.awayTeam.logoUrl} fallback={<Shield size={32} />} className="w-16 h-16 mx-auto object-contain" />
                        <p className="font-semibold text-gray-800">{result.awayTeam.name}</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-full mt-4 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Continuar</button>
            </div>
        </Modal>
    );
};

const NotificationModal: FC<{ notification: NotificationPayload | null; onClose: () => void }> = ({ notification, onClose }) => {
    useEffect(() => {
        if (notification?.show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification || !notification.show) return null;

    return (
        <div className="fixed top-5 right-5 bg-white shadow-lg rounded-lg p-4 w-full max-w-sm z-50 animate-pulse">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Mail size={14} className="text-white"/>
                </div>
                <div className="flex-1">
                    <p className="font-bold text-gray-800">{notification.title}</p>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                </div>
                <button onClick={onClose}><XCircle size={20} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
        </div>
    );
};


const PlayerCard: FC<{ player: Player; inTransferMarket?: boolean; }> = ({ player, inTransferMarket = false }) => {
    const { state, handleListForSale, handleAcceptIncomingOffer, handleRejectIncomingOffer, handleMakeOffer } = useGame();
    const isUsersPlayer = player.teamId === state.club.id;
    const incomingOffer = useMemo(() => state.transferOffers.find(o => o.isIncoming && o.playerId === player.id && o.status === 'pending'), [state.transferOffers, player.id]);
    
    const [offerModalVisible, setOfferModalVisible] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');

    const openOfferModal = () => {
        setOfferAmount(player.value.toString());
        setOfferModalVisible(true);
    };

    const submitOffer = () => {
        handleMakeOffer(player.id, player.name, Number(offerAmount));
        setOfferModalVisible(false);
    }
    
    return (
        <>
            <div className="bg-white rounded-lg shadow p-4 space-y-3 border-l-4 border-gray-200">
                <div className="flex items-center gap-4">
                    <ImageWithFallback src={player.photoUrl} fallback={<User size={32} className="text-gray-400" />} className="w-16 h-16 rounded-full object-cover" />
                    <div className="flex-1">
                        <p className="font-bold text-lg text-gray-800">{player.name}</p>
                        <p className="text-sm text-gray-500">{player.position} | {player.age} anos</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-indigo-600">{player.overall}</p>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden"><div className={`${getEnergyColor(player.energy)} h-full`} style={{width: `${player.energy}%`}}></div></div>
                    </div>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-600 space-y-1">
                       <p>Valor: <span className="font-bold text-gray-800">{formatCurrency(player.value)}</span></p>
                       <p>Contrato: <span className="font-bold text-gray-800">{player.contract}</span></p>
                    </div>
                    <div className="flex gap-2">
                        {isUsersPlayer && !incomingOffer && (
                            <button onClick={() => handleListForSale(player.id, !player.isForSale)} className={`px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors ${player.isForSale ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                                {player.isForSale ? 'Retirar' : 'Vender'}
                            </button>
                        )}
                        {isUsersPlayer && incomingOffer && (
                            <>
                                <button onClick={() => handleAcceptIncomingOffer(player.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors">Aceitar</button>
                                <button onClick={() => handleRejectIncomingOffer(player.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors">Rejeitar</button>
                            </>
                        )}
                        {inTransferMarket && (
                             <button onClick={openOfferModal} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors">Ofertar</button>
                        )}
                    </div>
                </div>
                 {incomingOffer && isUsersPlayer && (
                    <div className="text-center bg-green-50 text-green-700 p-2 rounded-md mt-2 text-sm">
                        Oferta de <strong>{formatCurrency(incomingOffer.amount)}</strong> por <strong>{incomingOffer.offeringTeamName}</strong>
                    </div>
                )}
            </div>
             <Modal isOpen={offerModalVisible} onClose={() => setOfferModalVisible(false)}>
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">Fazer Oferta por {player.name}</h3>
                    <p className="text-gray-600 mb-2">Valor de mercado: {formatCurrency(player.value)}</p>
                    <p className="text-gray-600 mb-4">Seu dinheiro: {formatCurrency(state.club.money)}</p>
                    <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg mb-4" />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setOfferModalVisible(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold">Cancelar</button>
                        <button onClick={submitOffer} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold" disabled={Number(offerAmount) > state.club.money || Number(offerAmount) <= 0}>Confirmar</button>
                    </div>
                </div>
            </Modal>
        </>
    )
}

const DashboardScreen = () => {
    const { state } = useGame();
    const playerTeam = useMemo(() => state.standings.find(t => t.id === state.club.id), [state.standings, state.club.id]);
    const nextMatchInfo = useMemo(() => state.schedule.find(m => m.week === state.week && (m.homeTeamId === state.club.id || m.awayTeamId === state.club.id)), [state.schedule, state.week, state.club.id]);
    const nextOpponent = useMemo(() => {
        if (!nextMatchInfo) return null;
        const opponentId = nextMatchInfo.homeTeamId === state.club.id ? nextMatchInfo.awayTeamId : nextMatchInfo.homeTeamId;
        return state.standings.find(t => t.id === opponentId);
    }, [nextMatchInfo, state.standings, state.club.id]);

    const pTPos = playerTeam ? state.standings.findIndex(t => t.id === playerTeam.id) + 1 : 0;
    const morale = getMoraleDescription(state.club.morale);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
                 <h2 className="text-xl font-bold text-gray-800 mb-4">Próximo Jogo</h2>
                 {playerTeam && nextOpponent ? (
                    <div className="flex justify-around items-center text-center">
                        <div className="w-1/3 space-y-2">
                           <ImageWithFallback src={playerTeam.logoUrl} fallback={<Shield size={32} />} className="w-16 h-16 mx-auto object-contain" />
                           <p className="font-semibold text-gray-800">{playerTeam.name}</p>
                           <p className="text-xs text-gray-500">(Casa)</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-400">VS</p>
                        <div className="w-1/3 space-y-2">
                           <ImageWithFallback src={nextOpponent.logoUrl} fallback={<Shield size={32} />} className="w-16 h-16 mx-auto object-contain" />
                           <p className="font-semibold text-gray-800">{nextOpponent.name}</p>
                           <p className="text-xs text-gray-500">(Fora)</p>
                        </div>
                    </div>
                 ) : (
                    <div className="text-center py-10 text-gray-500">
                        <Calendar size={48} className="mx-auto" />
                        <p className="mt-4 font-semibold">Fim de temporada!</p>
                    </div>
                )}
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 border-l-4 border-green-500">
                    <DollarSign size={32} className="text-green-500" />
                    <div>
                        <p className="text-sm text-gray-500">Orçamento</p>
                        <p className="text-xl font-bold text-gray-800" >{formatCurrency(state.club.money)}</p>
                    </div>
                </div>
                 <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 border-l-4 border-blue-500">
                    <Trophy size={32} className="text-blue-500" />
                    <div>
                        <p className="text-sm text-gray-500">Posição</p>
                        <p className="text-xl font-bold text-gray-800">{pTPos > 0 ? `${pTPos}º` : 'N/A'}</p>
                    </div>
                </div>
                 <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 border-l-4 border-amber-500">
                    <TrendingUp size={32} className="text-amber-500" />
                    <div>
                        <p className="text-sm text-gray-500">Moral</p>
                        <p className={`text-xl font-bold ${morale.color}`}>{morale.text}</p>
                    </div>
                </div>
                 <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 border-l-4 border-purple-500">
                    <Target size={32} className="text-purple-500" />
                    <div>
                        <p className="text-sm text-gray-500">Formação</p>
                        <p className="text-xl font-bold text-gray-800">{state.club.formation}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


const PlayersScreen = () => {
    const { state } = useGame();
    const clubPlayers = useMemo(() => state.leaguePlayers.filter(p => p.teamId === state.club.id).sort((a, b) => b.overall - a.overall), [state.leaguePlayers, state.club.id]);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clubPlayers.length > 0 ? clubPlayers.map(p => <PlayerCard key={p.id} player={p} />)
            : (
                <div className="md:col-span-2 xl:col-span-3 text-center py-10 text-gray-500">
                    <Users size={48} className="mx-auto" />
                    <p className="mt-4 font-semibold">Sem Jogadores no Plantel</p>
                    <p className="text-sm">Contrate jogadores no mercado!</p>
                </div>
            )}
        </div>
    )
}

const MarketScreen = () => {
    const { state } = useGame();
    const availablePlayers = useMemo(() => state.transferMarketPlayers.sort((a,b) => b.overall - a.overall), [state.transferMarketPlayers]);
    return(
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Mercado de Transferências</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {availablePlayers.length > 0 ? availablePlayers.map(p => <PlayerCard key={p.id} player={p} inTransferMarket={true} />)
                : (
                    <div className="md:col-span-2 xl:col-span-3 text-center py-10 text-gray-500">
                        <Briefcase size={48} className="mx-auto" />
                        <p className="mt-4 font-semibold">Mercado Vazio</p>
                    </div>
                )}
            </div>
        </div>
    )
}

const StandingsScreen = () => {
    const { state } = useGame();
    return(
        <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clube</th>
                        <th className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P</th>
                        <th className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">J</th>
                        <th className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">V</th>
                        <th className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">E</th>
                        <th className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">D</th>
                        <th className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SG</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {state.standings.map((team, index) => {
                        const colors = getPositionColor(index + 1);
                        const isPlayerTeam = team.id === state.club.id;
                        return (
                            <tr key={team.id} className={isPlayerTeam ? 'bg-indigo-50' : ''}>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap"><div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold ${colors.bg} ${colors.border} ${colors.text}`}>{index + 1}</div></td>
                                <td className="px-2 sm:px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><img src={team.logoUrl} alt={team.name} className="w-6 h-6"/><span className="font-medium text-gray-800">{team.name}</span></div></td>
                                <td className="px-2 sm:px-3 py-4 text-center font-bold text-gray-800">{team.points}</td>
                                <td className="px-2 sm:px-3 py-4 text-center text-gray-600">{team.played}</td>
                                <td className="px-2 sm:px-3 py-4 text-center text-gray-600">{team.wins}</td>
                                <td className="px-2 sm:px-3 py-4 text-center text-gray-600">{team.draws}</td>
                                <td className="px-2 sm:px-3 py-4 text-center text-gray-600">{team.losses}</td>
                                <td className="px-2 sm:px-3 py-4 text-center text-gray-600">{team.gd}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

const TacticsScreen = () => {
    const { state, dispatch } = useGame();
    const formations: Formation[] = ['4-4-2', '4-3-3', '5-3-2'];
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Táticas</h2>
            <p className="text-gray-600 mb-6">Escolha a formação que a sua equipa usará nas partidas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formations.map(f => (
                    <button key={f} onClick={() => dispatch({type: 'SET_FORMATION', payload: f})} className={`p-6 rounded-lg text-2xl font-bold border-2 transition-colors ${state.club.formation === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-indigo-400'}`}>
                        {f}
                    </button>
                ))}
            </div>
        </div>
    )
}

const EditorScreen = () => {
    const { state, dispatch } = useGame();
    const [activeTab, setActiveTab] = useState('Community');
    
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [authorName, setAuthorName] = useState('');
    const [patchVersion, setPatchVersion] = useState('1.0');

    const [editableTeams, setEditableTeams] = useState([...state.database.teams]);
    const [editablePlayers, setEditablePlayers] = useState([...state.leaguePlayers]);
    const [editableConstants, setEditableConstants] = useState({...state.database.constants});
    
    useEffect(() => {
        setEditableTeams(JSON.parse(JSON.stringify(state.database.teams)));
        setEditablePlayers(JSON.parse(JSON.stringify(state.leaguePlayers)));
        setEditableConstants(JSON.parse(JSON.stringify(state.database.constants)));
    }, [state.database.teams, state.leaguePlayers, state.database.constants]);

    const handlePublishPatch = async () => {
        if (!authorName.trim() || !patchVersion.trim()) {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Erro', message: 'Por favor, preencha o nome do autor e a versão.' } });
            return;
        }

        const patchData = {
            teams: editableTeams,
            players: editablePlayers,
            constants: editableConstants,
        };
        
        const success = await (window as any).dbService.publishPatch(authorName, patchVersion, patchData);

        if(success) {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Sucesso', message: `Patch de ${authorName} (v${patchVersion}) foi publicado!` } });
            const patches = await (window as any).dbService.getCommunityPatches();
            dispatch({ type: 'SET_COMMUNITY_PATCHES', payload: patches });
        } else {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Erro', message: `Falha ao publicar o patch.` } });
        }
        
        setPublishModalOpen(false);
        setAuthorName('');
        setPatchVersion('1.0');
    };
    
    const handleApplyCommunityPatch = (patch: PublishedPatch) => {
        dispatch({ type: 'APPLY_PATCH', payload: patch.data });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Patch Aplicado!', message: `O patch de ${patch.author} (v${patch.version}) foi aplicado.` } });
    }

    const handleTeamDataChange = (teamId: number, field: 'name' | 'logoUrl', value: string) => {
        setEditableTeams(currentTeams => currentTeams.map(t => t.id === teamId ? {...t, [field]: value} : t));
    }
    
    const handlePlayerChange = (playerId: number, field: keyof Player, value: string | number) => {
        setEditablePlayers(currentPlayers => currentPlayers.map(p => {
            if (p.id === playerId) {
                return { ...p, [field]: typeof p[field] === 'number' ? Number(value) : value };
            }
            return p;
        }));
    }

    const handleConstantChange = (key: keyof GameConstantsType, value: string) => {
        setEditableConstants(currentConstants => ({
            ...currentConstants,
            [key]: Number(value)
        }));
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Editor de Patches</h1>
            
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('Community')} className={`px-4 py-2 font-semibold ${activeTab === 'Community' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Comunidade</button>
                <button onClick={() => setActiveTab('Creator')} className={`px-4 py-2 font-semibold ${activeTab === 'Creator' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Criar Patch</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                {activeTab === 'Community' && (
                     <div className="space-y-4">
                         <h3 className="text-lg font-semibold">Navegar por Patches da Comunidade</h3>
                         {state.communityPatches.length === 0 ? (
                            <p className="text-gray-500">Nenhum patch foi publicado ainda. Seja o primeiro a criar um na aba 'Criar Patch'!</p>
                         ) : (
                            <ul className="space-y-3">
                                {state.communityPatches.map(patch => (
                                    <li key={patch.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                        <div>
                                            <p className="font-bold">Versão {patch.version}</p>
                                            <p className="text-sm text-gray-600">por {patch.author}</p>
                                        </div>
                                        <button onClick={() => handleApplyCommunityPatch(patch)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                            <Upload size={16}/><span>Aplicar</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                         )}
                     </div>
                )}
                {activeTab === 'Creator' && (
                    <div className="space-y-6">
                        <details className="space-y-4 bg-gray-50 p-4 rounded-lg"><summary className="text-lg font-semibold cursor-pointer">Equipas</summary>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {editableTeams.map(team => (
                                    <div key={team.id} className="space-y-1">
                                        <div className="flex items-center gap-2"><ImageWithFallback src={team.logoUrl} fallback={<Shield size={20}/>} className="w-6 h-6"/><span>{team.name}</span></div>
                                        <input type="text" placeholder="Nome da Equipa" value={team.name} onChange={e => handleTeamDataChange(team.id, 'name', e.target.value)} className="w-full text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-lg"/>
                                        <input type="text" placeholder="URL do Logo" value={team.logoUrl} onChange={e => handleTeamDataChange(team.id, 'logoUrl', e.target.value)} className="w-full text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-lg"/>
                                    </div>
                                ))}
                            </div>
                        </details>
                         <details className="space-y-4 bg-gray-50 p-4 rounded-lg"><summary className="text-lg font-semibold cursor-pointer">Jogadores</summary>
                             <div className="space-y-2 max-h-96 overflow-y-auto pr-2 mt-2">
                                {editablePlayers.map(player => (
                                   <details key={player.id} className="bg-white p-2 rounded-lg border">
                                       <summary className="font-semibold cursor-pointer">{player.name} ({player.teamName}) - OVR: {player.overall}</summary>
                                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                           <div><label className="text-xs text-gray-500">Nome</label><input type="text" value={player.name} onChange={e => handlePlayerChange(player.id, 'name', e.target.value)} className="w-full p-1 border rounded"/></div>
                                           <div><label className="text-xs text-gray-500">Foto (URL)</label><input type="text" value={player.photoUrl} onChange={e => handlePlayerChange(player.id, 'photoUrl', e.target.value)} className="w-full p-1 border rounded"/></div>
                                           <div><label className="text-xs text-gray-500">Idade</label><input type="number" value={player.age} onChange={e => handlePlayerChange(player.id, 'age', e.target.value)} className="w-full p-1 border rounded"/></div>
                                           <div><label className="text-xs text-gray-500">Overall</label><input type="number" value={player.overall} onChange={e => handlePlayerChange(player.id, 'overall', e.target.value)} className="w-full p-1 border rounded"/></div>
                                           <div><label className="text-xs text-gray-500">Potencial</label><input type="number" value={player.potential} onChange={e => handlePlayerChange(player.id, 'potential', e.target.value)} className="w-full p-1 border rounded"/></div>
                                       </div>
                                   </details>
                                ))}
                             </div>
                         </details>
                         <details className="space-y-4 bg-gray-50 p-4 rounded-lg"><summary className="text-lg font-semibold cursor-pointer">Constantes do Jogo</summary>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
                                {Object.keys(editableConstants).map(key => (
                                   <div key={key}>
                                       <label className="text-sm font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}</label>
                                       <input type="number" value={editableConstants[key as keyof GameConstantsType]} onChange={e => handleConstantChange(key as keyof GameConstantsType, e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg mt-1" step={key.includes('CHANCE') ? 0.01 : 1} />
                                   </div>
                                ))}
                             </div>
                         </details>
                        <div className="pt-4 mt-4 border-t">
                            <button onClick={() => setPublishModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
                                <Send size={18}/><span>Publicar Patch</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <Modal isOpen={publishModalOpen} onClose={() => setPublishModalOpen(false)} maxWidth="max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">Publicar Patch</h3>
                    <p className="text-sm text-gray-600 mb-4">As suas alterações em Equipas, Jogadores e Constantes serão publicadas como um único patch.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="authorName" className="text-sm font-medium text-gray-700">Seu Nome de Autor</label>
                            <input id="authorName" type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label htmlFor="patchVersion" className="text-sm font-medium text-gray-700">Versão do Patch</label>
                            <input id="patchVersion" type="text" value={patchVersion} onChange={e => setPatchVersion(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setPublishModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold">Cancelar</button>
                        <button onClick={handlePublishPatch} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">Publicar</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}


// =================================================================================
// --- SEÇÃO 7: COMPONENTE PRINCIPAL ---
// =================================================================================

const AuthProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const login = (user: AuthUser) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);
    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

const GameWrapper = () => {
    const [gameState, dispatch] = useReducer(gameReducer, getInitialState());
    const { currentUser } = useAuth();
    const [activeScreen, setActiveScreen] = useState('Painel');
    
    useEffect(() => {
        const loadPatches = async () => {
            if((window as any).dbService) {
                const patches = await (window as any).dbService.getCommunityPatches();
                dispatch({ type: 'SET_COMMUNITY_PATCHES', payload: patches });
            }
        };
        loadPatches();
    }, []);

    const { simulateWeek } = useGameLogic(gameState, dispatch);

    const handleStartGame = (managerName: string, selectedTeamId: number) => {
        playerIdCounter = 1;
        dispatch({ type: 'START_GAME', payload: { managerName, selectedTeamId } });
    };

    const handleLoadGame = (state: GameState) => {
        dispatch({ type: 'LOAD_GAME', payload: state });
    }

    const handleMakeOffer = (playerId: number, playerName: string, amount: number) => {
        if (gameState.club.money < amount) {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Erro', message: 'Dinheiro insuficiente!' } }); return;
        }
        dispatch({ type: 'MAKE_TRANSFER_OFFER_OUTGOING', payload: { playerId, amount } });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Oferta Enviada', message: `Oferta de ${formatCurrency(amount)} por ${playerName}.` } });
    };
    const handleAcceptIncomingOffer = (playerId: number) => {
        dispatch({ type: 'ACCEPT_TRANSFER_OFFER_INCOMING', payload: { playerId } });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Transferência Aceite', message: `Jogador vendido.` } });
    };
    const handleRejectIncomingOffer = (playerId: number) => {
        dispatch({ type: 'REJECT_TRANSFER_OFFER_INCOMING', payload: { playerId } });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Oferta Rejeitada', message: `Você rejeitou a oferta.` } });
    };
    const handleListForSale = (playerId: number, isForSale: boolean) => {
        dispatch({ type: 'LIST_PLAYER_FOR_SALE', payload: { playerId, isForSale } });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Mercado', message: isForSale ? 'Jogador listado.' : 'Jogador retirado da venda.' } });
    };

    const contextValue: GameContextType = {
        state: gameState, dispatch, simulateWeek, handleMakeOffer,
        handleAcceptIncomingOffer, handleRejectIncomingOffer, handleListForSale,
    };
    
    if (gameState.status === 'main-menu') {
        return <MainMenu onStartGame={handleStartGame} onLoadGame={handleLoadGame} teams={gameState.database.teams} />;
    }

    const screens: { [key: string]: React.ReactNode } = {
        'Painel': <DashboardScreen />,
        'Plantel': <PlayersScreen />,
        'Class.': <StandingsScreen />,
        'Mercado': <MarketScreen />,
        'Táticas': <TacticsScreen />,
        ...(currentUser && {'Editor': <EditorScreen />})
    };

    const screenIcons: { [key: string]: LucideIcon } = {
        'Painel': TrendingUp, 'Plantel': Users, 'Class.': Trophy, 'Mercado': DollarSign, 'Táticas': Target, 'Editor': Wrench
    };
     
    return (
        <GameContext.Provider value={contextValue}>
            <div className="bg-gray-100 min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow p-4 sm:p-6">
                    <div className="max-w-7xl mx-auto">
                        {screens[activeScreen]}
                    </div>
                </main>
                <div className="w-full text-center p-4 sticky bottom-0 bg-gray-100/80 backdrop-blur-sm border-t border-gray-200 md:hidden">
                    <button onClick={simulateWeek} disabled={gameState.isSimulating} className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors shadow-lg">
                        {gameState.isSimulating ? <LoaderCircle size={24} className="animate-spin" /> : <PlayCircle size={24} />}
                        <span>{gameState.isSimulating ? 'A Simular...' : 'Avançar Semana'}</span>
                    </button>
                </div>
                <nav className="bg-white shadow-t-lg sticky bottom-0 md:static">
                    <div className="max-w-7xl mx-auto flex justify-around">
                        {Object.keys(screens).map(name => {
                            const Icon = screenIcons[name];
                            return (
                                <button key={name} onClick={() => setActiveScreen(name)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 sm:py-3 text-xs sm:text-sm font-medium border-t-4 transition-colors ${activeScreen === name ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-indigo-500'}`}>
                                    <Icon size={22} />
                                    <span>{name}</span>
                                </button>
                            );
                        })}
                         <div className="hidden md:flex flex-1 items-center justify-center">
                             <button onClick={simulateWeek} disabled={gameState.isSimulating} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors shadow-lg">
                                {gameState.isSimulating ? <LoaderCircle size={20} className="animate-spin" /> : <PlayCircle size={20} />}
                                <span className="hidden lg:inline">{gameState.isSimulating ? 'A Simular...' : 'Avançar Semana'}</span>
                             </button>
                         </div>
                    </div>
                </nav>
            </div>
            <MatchResultModal result={gameState.matchResult} onClose={() => dispatch({ type: 'CLOSE_MODAL' })} />
            <NotificationModal notification={gameState.notification} onClose={() => dispatch({ type: 'HIDE_NOTIFICATION' })} />
        </GameContext.Provider>
    );
}

const App = () => {
    // Adiciona o script do sql.js e inicializa o banco de dados
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js';
        script.onload = async () => {
            try {
                const SQL = await (window as any).initSqlJs({
                    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
                });
                // Lógica de inicialização do DB
                const dbService = {
                    db: null as any,
                    async init() {
                        const savedDb = localStorage.getItem('fm_database');
                        const dbData = savedDb ? this.base64ToUint8(savedDb) : null;
                        this.db = new SQL.Database(dbData || undefined);
                        this.createTables();
                    },
                    save() {
                        const data = this.db.export();
                        localStorage.setItem('fm_database', this.uint8ToBase64(data));
                    },
                    createTables() {
                        this.db.exec(`
                            CREATE TABLE IF NOT EXISTS users (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                email TEXT UNIQUE NOT NULL,
                                password_hash TEXT NOT NULL
                            );
                            CREATE TABLE IF NOT EXISTS saved_games (
                                user_id INTEGER PRIMARY KEY,
                                game_state TEXT NOT NULL,
                                FOREIGN KEY (user_id) REFERENCES users (id)
                            );
                            CREATE TABLE IF NOT EXISTS community_patches (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                author TEXT NOT NULL,
                                version TEXT NOT NULL,
                                data TEXT NOT NULL
                            );
                        `);
                        this.save();
                    },
                    // Simulação de hash - NÃO USAR EM PRODUÇÃO
                    hashPassword(password: string) { return password.split('').reverse().join(''); },
                    
                    async registerUser(email: string, pass: string) {
                        try {
                            const password_hash = this.hashPassword(pass);
                            this.db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, password_hash]);
                            this.save();
                            return true;
                        } catch (e) {
                            console.error("Registration error:", e);
                            return false;
                        }
                    },
                    async loginUser(email: string, pass: string) {
                        const password_hash = this.hashPassword(pass);
                        const stmt = this.db.prepare('SELECT id, email FROM users WHERE email = ? AND password_hash = ?');
                        const result = stmt.getAsObject({':email': email, ':password_hash': password_hash});
                        stmt.free();
                        return result.id ? { id: result.id, email: result.email } : null;
                    },
                    async saveGame(userId: number, gameState: GameState) {
                        const stateString = JSON.stringify(gameState);
                        this.db.run('INSERT OR REPLACE INTO saved_games (user_id, game_state) VALUES (?, ?)', [userId, stateString]);
                        this.save();
                    },
                    async loadGame(userId: number) {
                        const stmt = this.db.prepare('SELECT game_state FROM saved_games WHERE user_id = ?');
                        const result = stmt.getAsObject({':user_id': userId});
                        stmt.free();
                        return result.game_state ? JSON.parse(result.game_state) : null;
                    },
                    async publishPatch(author: string, version: string, data: object) {
                        const dataString = JSON.stringify(data);
                        this.db.run('INSERT INTO community_patches (author, version, data) VALUES (?, ?, ?)', [author, version, dataString]);
                        this.save();
                        return true;
                    },
                    async getCommunityPatches() {
                        const res = this.db.exec("SELECT * FROM community_patches");
                        if (res.length === 0) return [];
                        return res[0].values.map((row: any) => ({
                            id: row[0],
                            author: row[1],
                            version: row[2],
                            data: JSON.parse(row[3])
                        }));
                    },
                    uint8ToBase64(arr: Uint8Array) {
                        return btoa(String.fromCharCode.apply(null, Array.from(arr)));
                    },
                    base64ToUint8(str: string) {
                        return new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
                    }
                };
                await dbService.init();
                (window as any).dbService = dbService;
            } catch (err) {
                console.error("Failed to load sql.js:", err);
            }
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <AuthProvider>
            <GameWrapper />
        </AuthProvider>
    )
}

export default App;