import React, { useState, useReducer, useEffect, createContext, useContext, useMemo, FC } from 'react';
import ReactDOM from 'react-dom/client'; // Importar ReactDOM para montar a aplicação

import { createClient } from '@supabase/supabase-js';

// --- Ícones para a Web (importação direta do lucide-react) ---
import {
    Users, Trophy, DollarSign, Calendar, TrendingUp, Target, Shield,
    Star, User, PlayCircle, RefreshCw, Mail, Briefcase, XCircle, LogIn, LogOut, Save,
    BarChart, Crosshair, Shirt, Zap, PlusCircle, LucideIcon, LoaderCircle, Wrench, Upload, Send,
    BriefcaseBusiness 
} from 'lucide-react';

// Importe o ficheiro CSS
import './styles.css';


// =================================================================================
// --- Configuração do Supabase ---
// =================================================================================
// Encontre estes valores no painel do seu projeto Supabase (Settings -> API)
const supabaseUrl = 'https://iqzbuldbxhtkmbcmpisk.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxemJ1bGRieGh0a21iY21waXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyOTQ3ODksImV4cCI6MjA2Njg3MDc4OX0.5rYcqgXI3zM2TRhWQy2EUwhiStOszv68Gk-lZ9ib51w'; // Chave anon do seu projeto Supabase

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =================================================================================
// --- URL de Produção do seu Frontend (Vercel) ---
// ESSENCIAL: Use a URL COMPLETA do seu jogo no Vercel aqui.
// Esta é a URL para a qual o Supabase deve redirecionar após a autenticação OAuth.
const VERCEL_FRONTEND_URL = 'https://sevenxfoot-s5oa-q02nfkxts-rian7xs-projects.vercel.app/';

// =================================================================================
// --- Serviço de API para interagir com o Supabase ---
// =================================================================================
// Declaração do apiService no topo para garantir acessibilidade
const apiService = {
    async registerUser(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            console.error('Erro no registo Supabase:', error.message);
            throw new Error(error.message);
        }
        console.log('Registo Supabase bem-sucedido:', data);
        return true;
    },

    async loginUser(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Erro no login Supabase:', error.message);
            throw new Error(error.message);
        }
        console.log('Login Supabase bem-sucedido:', data);
        return { id: data.user?.id || '', email: data.user?.email || '' };
    },

    async googleLogin() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: VERCEL_FRONTEND_URL 
            }
        });
        if (error) {
            console.error('Erro ao iniciar login Google com Supabase:', error.message);
            throw new Error(error.message);
        }
        return null;
    },

    async saveGame(userId: string, gameState: GameState) { // userId é string no Supabase
        const { data, error } = await supabase
            .from('saved_games')
            .upsert({ user_id: userId, game_state: gameState }, { onConflict: 'user_id' }); // user_id é a chave primária

        if (error) {
            console.error('Erro ao salvar jogo Supabase:', error.message);
            throw new Error(error.message);
        }
        console.log('Jogo salvo com sucesso no Supabase:', data);
        return true;
    },

    async loadGame(userId: string): Promise<GameState | null> { // userId é string no Supabase
        const { data, error } = await supabase
            .from('saved_games')
            .select('game_state')
            .eq('user_id', userId)
            .single(); // Espera um único resultado

        if (error && error.code !== 'PGRST116') { // PGRST116 é "no rows found", que é ok
            console.error('Erro ao carregar jogo Supabase:', error.message);
            throw new Error(error.message);
        }
        console.log('Jogo carregado do Supabase:', data);
        return data ? data.game_state : null;
    },

    async publishPatch(author: string, version: string, data: object) {
        const { data: newPatch, error } = await supabase
            .from('community_patches')
            .insert({ author, version, data });

        if (error) {
            console.error('Erro ao publicar patch Supabase:', error.message);
            throw new Error(error.message);
        }
        console.log('Patch publicado com sucesso no Supabase:', newPatch);
        return true;
    },

    async getCommunityPatches(): Promise<PublishedPatch[]> {
        const { data, error } = await supabase
            .from('community_patches')
            .select('*')
            .order('created_at', { ascending: false }); // Ordena por data de criação

        if (error) {
            console.error('Erro ao obter patches da comunidade Supabase:', error.message);
            throw new Error(error.message);
        }
        console.log('Patches da comunidade carregados do Supabase:', data);
        return data as PublishedPatch[];
    },
};


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
    CHANCE_OFERTA_TECNICO_BAIXA: 0.1, // Chance de receber oferta de clube de reputação menor
    CHANCE_OFERTA_TECNICO_MEDIA: 0.2, // Chance de receber oferta de clube de reputação similar
    CHANCE_OFERTA_TECNICO_ALTA: 0.05, // Chance de receber oferta de clube de reputação maior
    OFERTA_TECNICO_REPUTACAO_MIN: 50, // Reputação mínima para um clube fazer oferta
};

const NAMES = ["Silva", "Santos", "Costa", "Lima", "Oliveira", "Ferreira", "Alves", "Gomes", "Martins", "Souza", "Pereira", "Rodrigues"];
const FIRST_NAMES = ["João", "Carlos", "Felipe", "Roberto", "André", "Lucas", "Ricardo", "Bruno", "Pedro", "Vinícius", "Eduardo", "Gabriel"];

const initialTeamsDB: Team[] = [
    { id: 1, name: 'FC Santos', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/VHdNOT6_dN9ge26dO2YCvQ_96x96.png', reputation: 85 },
    { id: 2, name: 'Flamengo', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/orE554NToSkH6nuwofe7Yg_96x96.png', reputation: 90 },
    { id: 3, name: 'Palmeiras', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/7sp___w-4D2c-oE_3l6iSA_96x96.png', reputation: 88 },
    { id: 4, name: 'São Paulo', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/1w_4_Jff0xA4MOC123M2kg_96x96.png', reputation: 82 },
    { id: 5, name: 'Grêmio', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/z_H0-6j2_z3vtK_c-g_g1A_96x96.png', reputation: 78 },
    { id: 6, name: 'Internacional', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/wlFf_F-g_e3_gN-t_g_g1A_96x96.png', reputation: 76 },
    { id: 7, name: 'Atlético-MG', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/0_S_U-z1-6g_g_g_g_g1A_96x96.png', reputation: 80 },
    { id: 8, name: 'Cruzeiro', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/t-P0_g_g_g_g_g_g1A_96x96.png', reputation: 70 },
    { id: 9, name: 'Fluminense', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/t_g_g_g_g_g_g1A_96x96.png', reputation: 75 },
    { id: 10, name: 'Botafogo', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/t_g_g_g_g_g_g1A_96x96.png', reputation: 68 },
    { id: 11, name: 'Corinthians', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/t_g_g_g_g_g_g1A_96x96.png', reputation: 83 },
    { id: 12, name: 'Vasco', logoUrl: 'https://ssl.gstatic.com/onebox/media/sports/logos/t_g_g_g_g_g_g1A_96x96.png', reputation: 65 },
];


type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
type Formation = '4-4-2' | '4-3-3' | '5-3-2';

type Player = {
    id: number; name: string; teamId: number; teamName: string; position: PlayerPosition; age: number;
    overall: number; potential: number; salary: number; contract: number; morale: number; energy: number;
    photoUrl?: string; goals: number; assists: number; yellowCards: number; redCards: number;
    injuryDuration: number; suspensionDuration: number; value: number; isForSale: boolean;
};

type Team = { id: number; name: string; logoUrl?: string; reputation: number; }; // Adicionado reputação ao time
type TeamStanding = Team & { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; gd: number; points: number; overall: number; };

type TransferOfferPayload = { offerId: number; playerId: number; playerName: string; amount: number; offeringTeamName: string; };
type GameMessage = {
    id: number; week: number; read: boolean;
} & (
    | { type: 'finance' | 'contract' | 'result' | 'evolution' | 'award'; title: string; body: string; payload?: never; }
    | { type: 'transfer_offer_incoming'; title: string; body: string; payload: TransferOfferPayload; }
    | { type: 'transfer_offer_outgoing_accepted' | 'transfer_offer_outgoing_rejected'; title: string; body: string; payload: TransferOfferPayload; }
    | { type: 'manager_offer'; title: string; body: string; payload: ManagerOffer; } // Nova mensagem para oferta de técnico
);

type NotificationPayload = { show: boolean; title: string; message: string; };
type Match = { week: number; homeTeamId: number; awayTeamId: number; };
type TransferOffer = {
    playerId: number; playerName: string; offeringTeamId: number; offeringTeamName: string;
    amount: number; status: 'pending' | 'accepted' | 'rejected'; isIncoming: boolean; week: number;
};

type ManagerOffer = { // Novo tipo para ofertas de técnico
    offeringTeamId: number;
    offeringTeamName: string;
    offeringTeamReputation: number;
    salaryIncrease: number; // Aumento percentual do salário
    reputationChange: number; // Mudança na reputação do técnico
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
    managerReputation: number; // Reputação do técnico
    managerOffers: ManagerOffer[]; // Ofertas de transferência para o técnico
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
    | { type: 'PROCESS_WEEKLY_EVENTS'; payload: { newStandings: TeamStanding[]; matchResult: GameState['matchResult']; weeklyMessages: Omit<GameMessage, 'id' | 'read'>[]; newClubMoney: number; newClubMorale: number; updatedPlayers: Player[]; updatedMarket: Player[]; newWeek: number; newTransferOffers: TransferOffer[]; season?: number; managerReputationChange?: number; managerOffers?: ManagerOffer[]; } }
    | { type: 'MARK_MESSAGE_AS_READ'; payload: number }
    | { type: 'SET_FORMATION'; payload: Formation }
    | { type: 'SHOW_NOTIFICATION'; payload: { title: string; message: string; } }
    | { type: 'HIDE_NOTIFICATION' }
    | { type: 'CLOSE_MODAL' }
    | { type: 'ACCEPT_TRANSFER_OFFER_INCOMING'; payload: { playerId: number; } }
    | { type: 'REJECT_TRANSFER_OFFER_INCOMING'; payload: { playerId: number; } }
    | { type: 'MAKE_TRANSFER_OFFER_OUTGOING'; payload: { playerId: number; amount: number; } }
    | { type: 'LIST_PLAYER_FOR_SALE'; payload: { playerId: number; isForSale: boolean; } }
    | { type: 'ACCEPT_MANAGER_OFFER'; payload: ManagerOffer } // Nova ação para aceitar oferta de técnico
    | { type: 'REJECT_MANAGER_OFFER'; payload: ManagerOffer } // Nova ação para rejeitar oferta de técnico
    | { type: 'APPLY_PATCH'; payload: { teams: Team[], players: Player[], constants: GameConstantsType } }
    | { type: 'PUBLISH_PATCH'; payload: Omit<PublishedPatch, 'id'> }
    | { type: 'SET_COMMUNITY_PATCHES'; payload: PublishedPatch[] };

// =================================================================================
// --- SEÇÃO 2: GAME & AUTH CONTEXT ---
// =================================================================================
type AuthUser = {
    id: string; // Supabase usa string para user.id
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
    handleAcceptManagerOffer: (offer: ManagerOffer) => void; // Nova função
    handleRejectManagerOffer: (offer: ManagerOffer) => void; // Nova função
    apiService: typeof apiService; // apiService agora é parte do contexto
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
    if (teamList.length % 2 !== 0) teamList.push({ id: -1, name: "BYE", logoUrl: '' , reputation: 0}); // Adiciona reputação padrão para BYE
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
    if (morale >= 90) return { text: "Excelente", colorClass: 'text-green' };
    if (morale >= 75) return { text: "Bom", colorClass: 'text-green' };
    if (morale >= 60) return { text: "Médio", colorClass: 'text-amber' };
    if (morale >= 40) return { text: "Baixo", colorClass: 'text-red' };
    return { text: "Crítico", colorClass: 'text-red' };
};
const getEnergyColor = (energy: number) => energy >= 80 ? 'energy-green' : energy >= 50 ? 'energy-amber' : 'energy-red';
const getPositionColor = (position: number) => {
    if (position <= 1) return { bg: 'bg-amber', border: 'border-amber', text: 'text-amber' };
    if (position <= 4) return { bg: 'bg-green', border: 'border-green', text: 'text-green' };
    return { bg: 'bg-gray', border: 'border-gray', text: 'text-gray' };
};

// =================================================================================
// --- SEÇÃO 4: ESTADO DO JOGO (REDUCER E ESTADO INICIAL) ---
// =================================================================================
const getInitialState = (): GameState => ({
    status: 'main-menu', managerName: '', season: 2025, week: 1, isSimulating: false,
    club: { id: 0, name: '', money: 15000000, reputation: 75, morale: 80, formation: '4-4-2' },
    managerReputation: 50, // Reputação inicial do técnico
    managerOffers: [], // Nenhuma oferta no início
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
                club: { ...getInitialState().club, id: playerTeam.id, name: playerTeam.name, reputation: playerTeam.reputation }, // Define a reputação inicial do clube
                standings: initialStandings,
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
                transferOffers: payload.newTransferOffers,
                season: payload.season ?? state.season,
                managerReputation: payload.managerReputationChange ? Math.min(100, Math.max(0, state.managerReputation + payload.managerReputationChange)) : state.managerReputation,
                managerOffers: payload.managerOffers ?? state.managerOffers,
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
        case 'ACCEPT_MANAGER_OFFER': {
            const { offeringTeamId, offeringTeamName, reputationChange } = action.payload;
            const newClub = state.database.teams.find(t => t.id === offeringTeamId);
            if (!newClub) return state; // Deveria sempre encontrar

            // Atualiza o clube do jogador, reputação do técnico e limpa ofertas
            return {
                ...state,
                club: { ...state.club, id: newClub.id, name: newClub.name, reputation: newClub.reputation },
                managerReputation: Math.min(100, Math.max(0, state.managerReputation + reputationChange)),
                managerOffers: [], // Limpa todas as ofertas após aceitar uma
                messages: [...state.messages, { id: Date.now() + Math.random(), week: state.week, type: 'contract', title: 'Nova Carreira!', body: `Você aceitou a oferta do ${offeringTeamName}!` , read: false}],
            };
        }
        case 'REJECT_MANAGER_OFFER':
            return { ...state, managerOffers: state.managerOffers.filter(offer => offer.offeringTeamId !== action.payload.offeringTeamId) }; // Remove apenas a oferta rejeitada
        case 'APPLY_PATCH': {
            const { teams, players, constants } = action.payload;
            const updatedStandings = state.standings.map(st => {
                const updatedTeam = teams.find(t => t.id === st.id);
                const teamPlayers = players.filter(p => p.teamId === st.id);
                const newOverall = teamPlayers.length > 0 ? teamPlayers.reduce((acc, p) => acc + p.overall, 0) / teamPlayers.length : 0;
                return updatedTeam ? { ...st, name: updatedTeam.name, logoUrl: updatedTeam.logoUrl, reputation: updatedTeam.reputation, overall: newOverall } : st;
            });
            const newTeamsToAdd = teams.filter(team => !updatedStandings.some(st => st.id === team.id));
            const newStandingsForAddedTeams = newTeamsToAdd.map(team => {
                const teamPlayers = players.filter(p => p.teamId === team.id);
                const newOverall = teamPlayers.length > 0 ? teamPlayers.reduce((acc, p) => acc + p.overall, 0) / teamPlayers.length : 0;
                return { ...team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0, overall: newOverall };
            });

            return {
                ...state,
                leaguePlayers: players,
                database: {
                    ...state.database,
                    teams: teams,
                    constants: constants,
                },
                standings: [...updatedStandings, ...newStandingsForAddedTeams].sort((a, b) => b.overall - a.overall)
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
            
            newOverall = Math.max(40, newOverall);

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
            if (offer.isIncoming) {
                remainingOffers.push(offer);
                continue;
            }
            if (offer.status !== 'pending') continue;

            const player = playersInMarket.find((p: Player) => p.id === offer.playerId);
            if (!player) {
                messages.push({ week, type: 'transfer_offer_outgoing_rejected', title: `Oferta por ${offer.playerName} Cancelada`, body: `A oferta por ${offer.playerName} foi cancelada (jogador não disponível).`, payload: { ...offer, offerId: offer.playerId } });
                continue;
            }

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

    // Lógica para gerar ofertas de técnico no final da temporada
    const generateManagerOffers = (currentClubId: number, managerReputation: number, allTeams: Team[], season: number): ManagerOffer[] => {
        const offers: ManagerOffer[] = [];
        const eligibleTeams = allTeams.filter(team => team.id !== currentClubId && team.reputation >= constants.OFERTA_TECNICO_REPUTACAO_MIN);

        for (const team of eligibleTeams) {
            let chance = 0;
            const reputationDiff = team.reputation - managerReputation;

            if (reputationDiff > 10) {
                chance = constants.CHANCE_OFERTA_TECNICO_ALTA;
            } else if (reputationDiff >= -5 && reputationDiff <= 10) {
                chance = constants.CHANCE_OFERTA_TECNICO_MEDIA;
            } else {
                chance = constants.CHANCE_OFERTA_TECNICO_BAIXA;
            }

            if (Math.random() < chance) {
                const salaryIncrease = Math.floor(Math.random() * 20) + 5;
                const reputationChange = Math.floor(reputationDiff / 5);

                offers.push({
                    offeringTeamId: team.id,
                    offeringTeamName: team.name,
                    offeringTeamReputation: team.reputation,
                    salaryIncrease,
                    reputationChange,
                });
            }
        }
        return offers;
    };


    const simulateWeek = () => {
        if (state.isSimulating) return;
        dispatch({ type: 'START_SIMULATION' });

        setTimeout(() => {
            let tempStandings = JSON.parse(JSON.stringify(state.standings));
            let tempPlayers = JSON.parse(JSON.stringify(state.leaguePlayers));
            let tempMarketPlayers = JSON.parse(JSON.stringify(state.transferMarketPlayers));
            const weeklyMessages: Omit<GameMessage, 'id' | 'read'>[] = [];
            let playerMatchResult: GameState['matchResult'] = null;
            let newClubMoney = state.club.money;
            let newClubMorale = state.club.morale;
            let managerReputationChange = 0;
            let newManagerOffers: ManagerOffer[] = [];

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
                    // Reputação do técnico baseada no desempenho do clube
                    if (outcome === 'win') managerReputationChange += 1;
                    else if (outcome === 'loss') managerReputationChange -= 1;
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
                    managerReputationChange += 5; // Aumento de reputação por ser campeão
                } else {
                    // Se o clube do jogador não foi campeão, a reputação do técnico pode ser ajustada pelo desempenho na liga
                    const playerClubStanding = tempStandings.find(s => s.id === state.club.id);
                    if (playerClubStanding) {
                        const position = tempStandings.indexOf(playerClubStanding) + 1;
                        if (position > tempStandings.length / 2) managerReputationChange -= 2; // Perde reputação se terminar na metade inferior
                        else if (position <= 3) managerReputationChange += 2; // Ganha reputação se terminar no top 3
                    }
                }
                // Gera ofertas de técnico no final da temporada
                newManagerOffers = generateManagerOffers(state.club.id, state.managerReputation, state.database.teams, season);
                if (newManagerOffers.length > 0) {
                    weeklyMessages.push({ week: state.week, type: 'manager_offer', title: 'Oferta de Emprego!', body: `Você recebeu ${newManagerOffers.length} nova(s) oferta(s) de emprego!`, payload: newManagerOffers[0] });
                }

                updatedPlayers = updatedPlayers.map((p: Player) => ({ ...p, goals: 0, assists: 0, age: p.age + 1, contract: p.contract > season ? p.contract : season + 1 }));
                tempStandings = tempStandings.map((t: TeamStanding) => ({ ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }));
            }

            dispatch({
                type: 'PROCESS_WEEKLY_EVENTS', payload: {
                    newStandings: tempStandings, matchResult: playerMatchResult, weeklyMessages,
                    newClubMoney, newClubMorale, updatedPlayers, updatedMarket: tempMarketPlayers, newWeek, newTransferOffers: currentOffers,
                    season, managerReputationChange, managerOffers: newManagerOffers
                }
            });
        }, 1000);
    };

    return { simulateWeek };
};

// =================================================================================
// --- SEÇÃO 6: COMPONENTES DE UI ---
// =================================================================================

// Componente para imagem com fallback (se a URL falhar, mostra um ícone)
const ImageWithFallback: FC<{ src?: string; fallback: React.ReactNode; className: string }> = ({ src, fallback, className }) => {
    const [error, setError] = useState(false);
    useEffect(() => {
        setError(false); // Resetar erro quando a URL src muda
    }, [src]);
    if (!src || error) { return <div className={`${className} image-fallback-container`}>{fallback}</div>; }
    return <img src={src} onError={() => setError(true)} className={className} alt="" />;
};

// Componente de Modal genérico
const Modal: FC<{ children: React.ReactNode; isOpen: boolean; onClose: () => void; maxWidth?: string }> = ({ children, isOpen, onClose, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content ${maxWidth}`} onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

// Modal de Resultado da Partida
const MatchResultModal: FC<{ result: GameState['matchResult'] | null; onClose: () => void }> = ({ result, onClose }) => {
    if (!result || !result.show) return null;
    const outcome = result.homeScore > result.awayScore ? 'win' : result.homeScore < result.awayScore ? 'loss' : 'draw';
    const stylesByOutcome = {
        win: { bg: 'bg-green', icon: <Star size={32} />, text: 'Vitória!' },
        loss: { bg: 'bg-red', icon: <XCircle size={32} />, text: 'Derrota' },
        draw: { bg: 'bg-amber', icon: <Shield size={32} />, text: 'Empate' }
    };
    const { bg, icon, text } = stylesByOutcome[outcome];

    return (
        <Modal isOpen={result.show} onClose={onClose}>
            <div className={`match-modal-header ${bg}`}>
                <h3 className="text-2xl font-bold">{text}</h3>
                {icon}
            </div>
            <div className="match-modal-body space-y-4">
                <p className="match-modal-score-label">Resultado Final</p>
                <div className="match-modal-teams-container">
                    <div className="match-modal-team-info space-y-2">
                        <ImageWithFallback src={result.homeTeam.logoUrl} fallback={<Shield size={32} />} className="match-modal-team-logo" />
                        <p className="font-semibold text-gray-800">{result.homeTeam.name}</p>
                    </div>
                    <p className={`match-modal-score ${bg}`}>{result.homeScore} - {result.awayScore}</p>
                    <div className="match-modal-team-info space-y-2">
                        <ImageWithFallback src={result.awayTeam.logoUrl} fallback={<Shield size={32} />} className="match-modal-team-logo" />
                        <p className="font-semibold text-gray-800">{result.awayTeam.name}</p>
                    </div>
                </div>
                <button onClick={onClose} className="match-modal-continue-btn">Continuar</button>
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
        <div className="notification-modal animate-pulse">
            <div className="notification-content">
                <div className="notification-icon-container">
                    <Mail size={14} className="text-white"/>
                </div>
                <div className="notification-text-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                </div>
                <button onClick={onClose} className="notification-close-btn"><XCircle size={20}/></button>
            </div>
        </div>
    );
};


const PlayerCard: FC<{ player: Player; inTransferMarket?: boolean; }> = ({ player, inTransferMarket = false }) => {
    const { state, handleListForSale, handleAcceptIncomingOffer, handleRejectIncomingOffer, handleMakeOffer } = useGame();
    const isUsersPlayer = player.teamId === state.club.id;
    const incomingOffer = useMemo(() => state.transferOffers.find(o => o.isIncoming && o.status === 'pending' && o.playerId === player.id), [state.transferOffers, player.id]);

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
            <div className="player-card">
                <div className="player-card-header">
                    <ImageWithFallback src={player.photoUrl} fallback={<User size={32} className="text-gray-400" />} className="player-card-photo" />
                    <div className="player-card-info">
                        <p className="player-card-name">{player.name}</p>
                        <p className="player-card-details">{player.position} | {player.age} anos</p>
                    </div>
                    <div className="player-card-overall-section">
                        <p className="player-card-overall">{player.overall}</p>
                        <div className="player-card-energy-bar-bg"><div className={`${getEnergyColor(player.energy)} player-card-energy-bar-fill`} style={{width: `${player.energy}%`}}></div></div>
                    </div>
                </div>
                <div className="player-card-footer">
                    <div className="player-card-stats">
                       <p>Valor: <span className="font-bold text-gray-800">{formatCurrency(player.value)}</span></p>
                       <p>Contrato: <span className="font-bold text-gray-800">{player.contract}</span></p>
                    </div>
                    <div className="player-card-actions">
                        {isUsersPlayer && !incomingOffer && (
                            <button onClick={() => handleListForSale(player.id, !player.isForSale)} className={`player-card-action-btn ${player.isForSale ? 'retire' : 'sell'}`}>
                                {player.isForSale ? 'Retirar' : 'Vender'}
                            </button>
                        )}
                        {isUsersPlayer && incomingOffer && (
                            <>
                                <button onClick={() => handleAcceptIncomingOffer(player.id)} className="player-card-action-btn accept">Aceitar</button>
                                <button onClick={() => handleRejectIncomingOffer(player.id)} className="player-card-action-btn reject">Rejeitar</button>
                            </>
                        )}
                        {inTransferMarket && (
                             <button onClick={openOfferModal} className="player-card-action-btn offer">Ofertar</button>
                        )}
                    </div>
                </div>
                 {incomingOffer && isUsersPlayer && (
                    <div className="player-card-incoming-offer">
                        Oferta de <strong>{formatCurrency(incomingOffer.amount)}</strong> por <strong>{incomingOffer.offeringTeamName}</strong>
                    </div>
                )}
            </div>
             <Modal isOpen={offerModalVisible} onClose={() => setOfferModalVisible(false)}>
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">Fazer Oferta por {player.name}</h3>
                    <p className="text-gray-600 mb-2">Valor de mercado: {formatCurrency(player.value)}</p>
                    <p className="text-gray-600 mb-4">Seu dinheiro: {formatCurrency(state.club.money)}</p>
                    <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} className="offer-modal-input" />
                    <div className="offer-modal-actions">
                        <button onClick={() => setOfferModalVisible(false)} className="offer-modal-cancel-btn">Cancelar</button>
                        <button onClick={submitOffer} className="offer-modal-confirm-btn" disabled={Number(offerAmount) > state.club.money || Number(offerAmount) <= 0}>Confirmar</button>
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
        <div className="dashboard-grid">
            <div className="dashboard-card">
                 <h2 className="dashboard-card-title">Próximo Jogo</h2>
                 {playerTeam && nextOpponent ? (
                    <div className="next-match-info text-center">
                        <div className="next-match-team-section space-y-2">
                           <ImageWithFallback src={playerTeam.logoUrl} fallback={<Shield size={32} />} className="next-match-team-logo" />
                           <p className="font-semibold text-gray-800">{playerTeam.name}</p>
                           <p className="text-xs text-gray-500">(Casa)</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-400">VS</p>
                        <div className="next-match-team-section space-y-2">
                           <ImageWithFallback src={nextOpponent.logoUrl} fallback={<Shield size={32} />} className="next-match-team-logo" />
                           <p className="font-semibold text-gray-800">{nextOpponent.name}</p>
                           <p className="text-xs text-gray-500">(Fora)</p>
                        </div>
                    </div>
                 ) : (
                    <div className="dashboard-no-game">
                        <Calendar size={48} className="icon" />
                        <p className="mt-4 font-semibold">Fim de temporada!</p>
                    </div>
                )}
            </div>
            <div className="dashboard-metrics-grid">
                <div className="metric-card border-green">
                    <DollarSign size={32} className="metric-icon" />
                    <div>
                        <p className="text-sm text-gray-500">Orçamento</p>
                        <p className="text-xl font-bold text-gray-800" >{formatCurrency(state.club.money)}</p>
                    </div>
                </div>
                 <div className="metric-card border-blue">
                    <Trophy size={32} className="metric-icon" />
                    <div>
                        <p className="text-sm text-gray-500">Posição</p>
                        <p className="text-xl font-bold text-gray-800">{pTPos > 0 ? `${pTPos}º` : 'N/A'}</p>
                    </div>
                </div>
                 <div className="metric-card border-amber">
                    <TrendingUp size={32} className="metric-icon" />
                    <div>
                        <p className="text-sm text-gray-500">Moral</p>
                        <p className={`text-xl font-bold ${morale.colorClass}`}>{morale.text}</p>
                    </div>
                </div>
                 <div className="metric-card border-purple">
                    <Target size={32} className="metric-icon" />
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
        <div className="players-grid">
            {clubPlayers.length > 0 ? clubPlayers.map(p => <PlayerCard key={p.id} player={p} />)
            : (
                <div className="players-no-players">
                    <Users size={48} className="icon" />
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
        <div className="market-section">
            <h2 className="market-title">Mercado de Transferências</h2>
            <div className="market-players-grid">
                {availablePlayers.length > 0 ? availablePlayers.map(p => <PlayerCard key={p.id} player={p} inTransferMarket={true} />)
                : (
                    <div className="market-no-players">
                        <Briefcase size={48} className="icon" />
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
        <div className="standings-container">
            <table className="standings-table">
                <thead>
                    <tr>
                        <th className="px-2">Pos</th>
                        <th className="px-2">Clube</th>
                        <th className="px-2">P</th>
                        <th className="px-2">J</th>
                        <th className="px-2">V</th>
                        <th className="px-2">E</th>
                        <th className="px-2">D</th>
                        <th className="px-2">SG</th>
                    </tr>
                </thead>
                <tbody>
                    {state.standings.map((team, index) => {
                        const colors = getPositionColor(index + 1);
                        const isPlayerTeam = team.id === state.club.id;
                        return (
                            <tr key={team.id} className={isPlayerTeam ? 'player-team-row' : ''}>
                                <td><div className={`standings-pos-circle ${colors.bg} ${colors.border} ${colors.text}`}>{index + 1}</div></td>
                                <td><div className="standings-team-cell"><img src={team.logoUrl} alt={team.name} className="standings-team-logo"/><span className="standings-team-name">{team.name}</span></div></td>
                                <td className="standings-points">{team.points}</td>
                                <td className="standings-stat">{team.played}</td>
                                <td className="standings-stat">{team.wins}</td>
                                <td className="standings-stat">{team.draws}</td>
                                <td className="standings-stat">{team.losses}</td>
                                <td className="standings-stat">{team.gd}</td>
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
        <div className="tactics-container">
            <h2 className="tactics-title">Táticas</h2>
            <p className="tactics-description">Escolha a formação que a sua equipa usará nas partidas.</p>
            <div className="formation-grid">
                {formations.map(f => (
                    <button key={f} onClick={() => dispatch({type: 'SET_FORMATION', payload: f})} className={`formation-button ${state.club.formation === f ? 'active' : ''}`}>
                        {f}
                    </button>
                ))}
            </div>
        </div>
    )
}

// Nova Tela do Gerente
const ManagerScreen: FC = () => {
    const { state, dispatch, handleAcceptManagerOffer, handleRejectManagerOffer } = useGame();

    const getReputationDescription = (reputation: number) => {
        if (reputation >= 90) return { text: "Lendário", colorClass: 'text-green-500' };
        if (reputation >= 75) return { text: "Renomado", colorClass: 'text-blue-500' };
        if (reputation >= 60) return { text: "Respeitável", colorClass: 'text-amber-500' };
        if (reputation >= 40) return { text: "Promissor", colorClass: 'text-gray-400' };
        return { text: "Desconhecido", colorClass: 'text-red-500' };
    };

    const reputationInfo = getReputationDescription(state.managerReputation);

    return (
        <div className="manager-container">
            <h2 className="manager-title">Perfil do Gerente</h2>
            <div className="manager-card">
                <div className="manager-info">
                    <User size={48} className="text-gray-400" />
                    <div>
                        <p className="manager-name">{state.managerName}</p>
                        <p className="manager-reputation-label">Reputação: <span className={`font-bold ${reputationInfo.colorClass}`}>{reputationInfo.text} ({state.managerReputation})</span></p>
                    </div>
                </div>
            </div>

            <div className="manager-offers-section">
                <h3 className="manager-offers-title">Ofertas de Emprego</h3>
                {state.managerOffers.length === 0 ? (
                    <p className="no-offers-message">Nenhuma oferta de emprego no momento.</p>
                ) : (
                    <ul className="offers-list">
                        {state.managerOffers.map((offer, index) => (
                            <li key={index} className="offer-item">
                                <div className="offer-details">
                                    <p className="offer-team-name">Oferta de: <strong>{offer.offeringTeamName}</strong></p>
                                    <p className="offer-reputation">Reputação do Clube: {offer.offeringTeamReputation}</p>
                                    <p className="offer-salary">Aumento Salarial: +{offer.salaryIncrease}%</p>
                                    <p className="offer-reputation-change">Mudança de Reputação: {offer.reputationChange > 0 ? `+${offer.reputationChange}` : offer.reputationChange}</p>
                                </div>
                                <div className="offer-actions">
                                    <button onClick={() => handleAcceptManagerOffer(offer)} className="offer-accept-btn">Aceitar</button>
                                    <button onClick={() => handleRejectManagerOffer(offer)} className="offer-reject-btn">Rejeitar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


const EditorScreen = () => {
    const { state, dispatch, apiService } = useGame();
    const [activeTab, setActiveTab] = useState('Community');

    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [authorName, setAuthorName] = useState('');
    const [patchVersion, setPatchVersion] = useState('1.0');

    const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamLogoUrl, setNewTeamLogoUrl] = useState('');


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

        try {
            const success = await apiService.publishPatch(authorName, patchVersion, patchData);
            if(success) {
                dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Sucesso', message: `Patch de ${authorName} (v${patchVersion}) foi publicado!` } });
                const patches = await apiService.getCommunityPatches();
                dispatch({ type: 'SET_COMMUNITY_PATCHES', payload: patches });
            } else {
                alert('Falha ao publicar o patch.');
            }
        } catch (error: any) {
            alert(error.message);
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

    const handleAddNewTeam = () => {
        if (!newTeamName.trim()) {
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Erro', message: 'O nome do time não pode estar vazio!' } });
            return;
        }

        const newTeamId = Date.now() + Math.floor(Math.random() * 1000);
        
        const newPlayersForTeam: Player[] = [];
        const positions: PlayerPosition[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
        positions.forEach(pos => {
            let count = 0;
            if (pos === 'GOL') count = 1;
            else if (pos === 'ZAG' || pos === 'LAT') count = 2;
            else if (pos === 'VOL' || pos === 'MEI') count = 2;
            else if (pos === 'ATA') count = 3;

            for (let i = 0; i < count; i++) {
                newPlayersForTeam.push(generatePlayer(newTeamId, newTeamName, pos, state.database.constants));
            }
        });

        const newTeam: Team = {
            id: newTeamId,
            name: newTeamName,
            logoUrl: newTeamLogoUrl || 'https://via.placeholder.com/96x96.png?text=Logo',
            reputation: 50
        };

        setEditableTeams(prevTeams => [...prevTeams, newTeam]);
        setEditablePlayers(prevPlayers => [...prevPlayers, ...newPlayersForTeam]);

        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Sucesso', message: `Time "${newTeamName}" adicionado!` } });
        setAddTeamModalOpen(false);
        setNewTeamName('');
        setNewTeamLogoUrl('');
    };


    return (
        <div className="editor-container space-y-6">
            <h1 className="editor-title">Editor de Patches</h1>

            <div className="editor-tabs">
                <button onClick={() => setActiveTab('Community')} className={`editor-tab-button ${activeTab === 'Community' ? 'active' : ''}`}>Comunidade</button>
                <button onClick={() => setActiveTab('Creator')} className={`editor-tab-button ${activeTab === 'Creator' ? 'active' : ''}`}>Criar Patch</button>
            </div>

            <div className="editor-content-card">
                {activeTab === 'Community' && (
                     <div className="community-patches-section space-y-4">
                         <h3 className="community-patches-title">Navegar por Patches da Comunidade</h3>
                         {state.communityPatches.length === 0 ? (
                            <p className="no-patches-message">Nenhum patch foi publicado ainda. Seja o primeiro a criar um na aba 'Criar Patch'!</p>
                         ) : (
                            <ul className="patch-list space-y-3">
                                {state.communityPatches.map(patch => (
                                    <li key={patch.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700">
                                        <div>
                                            <p className="font-bold text-white">Versão {patch.version}</p>
                                            <p className="text-sm text-gray-300">por {patch.author}</p>
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
                    <div className="creator-section space-y-6">
                        <details className="editor-details" open> {/* 'open' para abrir por padrão no editor */}
                            <summary>Equipas</summary>
                            <div className="editor-details-content-grid teams-grid">
                                {editableTeams.map(team => (
                                    <div key={team.id} className="editor-field-group">
                                        <div className="editor-team-input-group">
                                            <ImageWithFallback src={team.logoUrl} fallback={<Shield size={20} className="text-gray-400"/>} className="editor-team-logo"/>
                                            <span className="text-white">{team.name}</span>
                                        </div>
                                        <input type="text" placeholder="Nome da Equipa" value={team.name} onChange={e => handleTeamDataChange(team.id, 'name', e.target.value)} className="editor-input"/>
                                        <input type="text" placeholder="URL do Logo" value={team.logoUrl} onChange={e => handleTeamDataChange(team.id, 'logoUrl', e.target.value)} className="editor-input"/>
                                    </div>
                                ))}
                            </div>
                            {/* NOVO BOTÃO PARA ADICIONAR TIME */}
                            <button onClick={() => setAddTeamModalOpen(true)} className="add-new-team-button">
                                <PlusCircle size={18}/><span>Adicionar Novo Time</span>
                            </button>
                        </details>
                        <details className="editor-details">
                            <summary>Jogadores</summary>
                            <div className="editor-players-list">
                                {editablePlayers.map(player => (
                                    <details key={player.id} className="editor-player-item">
                                        <summary className="editor-player-summary">{player.name} ({player.teamName}) - OVR: {player.overall}</summary>
                                        <div className="editor-player-fields-grid">
                                            <div><label className="editor-field-label">Nome</label><input type="text" value={player.name} onChange={e => handlePlayerChange(player.id, 'name', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Foto (URL)</label><input type="text" value={player.photoUrl} onChange={e => handlePlayerChange(player.id, 'photoUrl', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Idade</label><input type="number" value={player.age} onChange={e => handlePlayerChange(player.id, 'age', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Overall</label><input type="number" value={player.overall} onChange={e => handlePlayerChange(player.id, 'overall', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Potencial</label><input type="number" value={player.potential} onChange={e => handlePlayerChange(player.id, 'potential', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Posição</label>
                                                <select value={player.position} onChange={e => handlePlayerChange(player.id, 'position', e.target.value as PlayerPosition)} className="editor-input">
                                                    <option value="GOL">GOL</option>
                                                    <option value="ZAG">ZAG</option>
                                                    <option value="LAT">LAT</option>
                                                    <option value="VOL">VOL</option>
                                                    <option value="MEI">MEI</option>
                                                    <option value="ATA">ATA</option>
                                                </select>
                                            </div>
                                            <div><label className="editor-field-label">Salário</label><input type="number" value={player.salary} onChange={e => handlePlayerChange(player.id, 'salary', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Contrato</label><input type="number" value={player.contract} onChange={e => handlePlayerChange(player.id, 'contract', e.target.value)} className="editor-input"/></div>
                                            <div><label className="editor-field-label">Valor</label><input type="number" value={player.value} onChange={e => handlePlayerChange(player.id, 'value', e.target.value)} className="editor-input"/></div>
                                            {/* Pode adicionar mais campos como goals, assists, etc., mas lembre-se que eles são redefinidos */}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </details>
                        <details className="editor-details">
                            <summary>Constantes do Jogo</summary>
                            <div className="editor-details-content-grid constants-grid">
                                {Object.keys(editableConstants).map(key => (
                                    <div key={key} className="editor-constant-input-group">
                                        <label className="editor-constant-label">{key.replace(/_/g, ' ')}</label>
                                        <input type="number" value={editableConstants[key as keyof GameConstantsType]} onChange={e => handleConstantChange(key as keyof GameConstantsType, e.target.value)} className="editor-input" step={key.includes('CHANCE') ? 0.01 : 1} />
                                    </div>
                                ))}
                            </div>
                        </details>
                        <div className="editor-publish-section">
                            <button onClick={() => setPublishModalOpen(true)} className="publish-patch-button">
                                <Send size={18}/><span>Publicar Patch</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* NOVO MODAL PARA ADICIONAR TIME */}
            <Modal isOpen={addTeamModalOpen} onClose={() => setAddTeamModalOpen(false)} maxWidth="max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">Adicionar Novo Time</h3>
                    <div className="space-y-4">
                        <div className="publish-modal-input-group">
                            <label htmlFor="newTeamName" className="publish-modal-label">Nome do Time</label>
                            <input id="newTeamName" type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="publish-modal-input" placeholder="Nome do time"/>
                        </div>
                        <div className="publish-modal-input-group">
                            <label htmlFor="newTeamLogoUrl" className="publish-modal-label">URL do Logo (Opcional)</label>
                            <input id="newTeamLogoUrl" type="text" value={newTeamLogoUrl} onChange={e => setNewTeamLogoUrl(e.target.value)} className="publish-modal-input" placeholder="http://exemplo.com/logo.png"/>
                        </div>
                    </div>
                    <div className="publish-modal-actions">
                        <button onClick={() => setAddTeamModalOpen(false)} className="publish-modal-cancel-btn">Cancelar</button>
                        <button onClick={handleAddNewTeam} className="publish-modal-confirm-btn" disabled={!newTeamName.trim()}>Adicionar Time</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Publicar Patch (já existente) */}
            <Modal isOpen={publishModalOpen} onClose={() => setPublishModalOpen(false)} maxWidth="max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">Publicar Patch</h3>
                    <p className="text-sm text-gray-600 mb-4">As suas alterações em Equipas, Jogadores e Constantes serão publicadas como um único patch.</p>
                    <div className="space-y-4">
                        <div className="publish-modal-input-group">
                            <label htmlFor="authorName" className="publish-modal-label">Seu Nome de Autor</label>
                            <input id="authorName" type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} className="publish-modal-input"/>
                        </div>
                        <div className="publish-modal-input-group">
                            <label htmlFor="patchVersion" className="publish-modal-label">Versão do Patch</label>
                            <input id="patchVersion" type="text" value={patchVersion} onChange={e => setPatchVersion(e.target.value)} className="publish-modal-input"/>
                        </div>
                    </div>
                    <div className="publish-modal-actions">
                        <button onClick={() => setPublishModalOpen(false)} className="publish-modal-cancel-btn">Cancelar</button>
                        <button onClick={handlePublishPatch} className="publish-modal-confirm-btn">Publicar</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}


// =================================================================================
// --- SEÇÃO 7: COMPONENTE PRINCIPAL ---
// =================================================================================

// Provedor de Autenticação com Supabase
const AuthProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

    // Monitora o estado de autenticação do Supabase
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Supabase Auth State Change Event:", event, "Session:", session);
            if (session) {
                setCurrentUser({ id: session.user.id, email: session.user.email || 'N/A' });
                console.log("User set:", session.user.id, session.user.email);
            } else {
                setCurrentUser(null);
                console.log("User logged out or no session.");
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const login = (user: AuthUser) => setCurrentUser(user);
    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Erro ao fazer logout Supabase:', error.message);
            alert('Erro ao fazer logout.');
        } else {
            setCurrentUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

// Wrapper do Jogo: Gerencia o estado global e a navegação entre telas
const GameWrapper = () => {
    const [gameState, dispatch] = useReducer(gameReducer, getInitialState());
    const { currentUser } = useAuth();
    const [activeScreen, setActiveScreen] = useState('Painel');

    useEffect(() => {
        const loadInitialDataAndUserGame = async () => {
            try {
                const patches = await apiService.getCommunityPatches();
                dispatch({ type: 'SET_COMMUNITY_PATCHES', payload: patches });

                if (currentUser && gameState.status === 'main-menu') {
                    console.log("GameWrapper: User logged in, attempting to load saved game...");
                    const savedGame = await apiService.loadGame(currentUser.id);
                    if (savedGame) {
                        console.log("GameWrapper: Saved game found, dispatching LOAD_GAME.");
                        dispatch({ type: 'LOAD_GAME', payload: savedGame });
                    } else {
                        console.log("GameWrapper: No saved game found for this user. Staying on main menu.");
                    }
                }
            } catch (error) {
                console.error('GameWrapper: Erro ao carregar dados iniciais ou jogo do utilizador:', error);
                dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Erro de Carregamento', message: 'Não foi possível carregar dados iniciais ou jogo salvo.' } });
            }
        };

        loadInitialDataAndUserGame();
    }, [currentUser, gameState.status, dispatch]);


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

    const handleAcceptManagerOffer = (offer: ManagerOffer) => {
        dispatch({ type: 'ACCEPT_MANAGER_OFFER', payload: offer });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Oferta Aceite!', message: `Você aceitou a oferta do ${offer.offeringTeamName}!` } });
    };

    const handleRejectManagerOffer = (offer: ManagerOffer) => {
        dispatch({ type: 'REJECT_MANAGER_OFFER', payload: offer });
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { title: 'Oferta Rejeitada', message: `Você rejeitou a oferta do ${offer.offeringTeamName}.` } });
    };

    const contextValue: GameContextType = {
        state: gameState,
        dispatch,
        simulateWeek,
        handleMakeOffer,
        handleAcceptIncomingOffer,
        handleRejectIncomingOffer,
        handleListForSale,
        handleAcceptManagerOffer,
        handleRejectManagerOffer,
        apiService: apiService,
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
        'Gerente': <ManagerScreen />,
        ...(currentUser && {'Editor': <EditorScreen />})
    };

    const screenIcons: { [key: string]: LucideIcon } = {
        'Painel': TrendingUp, 'Plantel': Users, 'Class.': Trophy, 'Mercado': DollarSign, 'Táticas': Target, 'Editor': Wrench, 'Gerente': BriefcaseBusiness
    };

    return (
        <GameContext.Provider value={contextValue}>
            <div className="game-layout">
                <Header />
                <main className="flex-grow p-4 sm:p-6">
                    <div className="max-w-7xl mx-auto">
                        {screens[activeScreen]}
                    </div>
                </main>
                <nav className="footer-nav-bottom">
                    <div className="footer-nav-inner">
                        {Object.keys(screens).map(name => {
                            const Icon = screenIcons[name];
                            return (
                                <button key={name} onClick={() => setActiveScreen(name)} className={`nav-button ${activeScreen === name ? 'active' : ''}`}>
                                    <Icon size={22} />
                                    <span>{name}</span>
                                </button>
                            );
                        })}
                         <div className="nav-simulate-button-container">
                             <button onClick={simulateWeek} disabled={gameState.isSimulating} className="nav-simulate-button">
                                {gameState.isSimulating ? <LoaderCircle size={20} className="animate-spin" /> : <PlayCircle size={20} />}
                                <span>{gameState.isSimulating ? 'A Simular...' : 'Avançar Semana'}</span>
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

// Componente Raiz da Aplicação
export default function App() { // Exportação padrão do componente App
    return (
        <AuthProvider>
            <GameWrapper />
        </AuthProvider>
    )
}

// O código de montagem da raiz (ReactDOM.createRoot) será no main.tsx ou index.tsx do seu projeto Vite/CRA
