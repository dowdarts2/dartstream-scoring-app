// Supabase Configuration
console.log('supabase-config.js loading...');

const SUPABASE_URL = 'https://kswwbqumgsdissnwuiab.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd3dicXVtZ3NkaXNzbnd1aWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODMwNTIsImV4cCI6MjA4MDA1OTA1Mn0.b-z8JqL1dBYJcrrzSt7u6VAaFAtTOl1vqqtFFgHkJ50';

// Initialize Supabase client
function getSupabaseClient() {
    if (!window.supabaseClient) {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.error('Supabase library not loaded yet');
            return null;
        }
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized');
        } catch (error) {
            console.error('Error initializing Supabase client:', error);
            return null;
        }
    }
    return window.supabaseClient;
}

// Player Library Database Functions
const PlayerDB = {
    // Fetch all players from database
    async getAllPlayers() {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                console.error('Supabase client not available');
                return [];
            }
            
            // Get all players
            const { data: players, error: playersError } = await supabase
                .from('players')
                .select('*')
                .order('first_name', { ascending: true });
            
            if (playersError) throw playersError;
            
            // Get all player accounts to check for linked accounts
            const { data: accounts, error: accountsError } = await supabase
                .from('player_accounts')
                .select('account_linked_player_id, email');
            
            if (accountsError) throw accountsError;
            
            // Create a map of player_id to account info
            const accountMap = new Map();
            (accounts || []).forEach(account => {
                if (account.account_linked_player_id) {
                    accountMap.set(account.account_linked_player_id, account.email);
                }
            });
            
            console.log('Fetched players from Supabase:', players);
            console.log('Account linkages:', accountMap);
            
            return (players || []).map(player => ({
                id: player.id,
                firstName: player.first_name,
                lastName: player.last_name,
                nationality: player.nationality,
                createdAt: player.created_at,
                email: accountMap.get(player.id) || null,
                account_linked_player_id: accountMap.has(player.id) ? player.id : null
            }));
        } catch (error) {
            console.error('Error fetching players:', error);
            return [];
        }
    },

    // Add a new player
    async addPlayer(firstName, lastName, nationality = null) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }
            
            console.log('Adding player:', firstName, lastName, nationality);
            
            const { data, error } = await supabase
                .from('players')
                .insert([
                    { 
                        first_name: firstName,
                        last_name: lastName,
                        nationality: nationality
                    }
                ])
                .select();
            
            console.log('Insert result:', { data, error });
            
            if (error) throw error;
            
            return {
                id: data[0].id,
                firstName: data[0].first_name,
                lastName: data[0].last_name,
                nationality: data[0].nationality,
                createdAt: data[0].created_at
            };
        } catch (error) {
            console.error('Error adding player:', error);
            console.error('Error details:', error.message, error.code);
            throw error;
        }
    },

    // Update a player
    async updatePlayer(id, firstName, lastName, nationality = null, customId = null) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }
            
            const updateData = { 
                first_name: firstName,
                last_name: lastName
            };
            
            if (nationality !== null) {
                updateData.nationality = nationality;
            }
            
            // Note: customId parameter is accepted but not used
            // The id field is a UUID primary key and cannot be updated
            // If you need a custom player ID, add a separate 'player_number' or 'custom_id' column
            
            const { data, error } = await supabase
                .from('players')
                .update(updateData)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            
            return {
                id: data[0].id,
                firstName: data[0].first_name,
                lastName: data[0].last_name,
                nationality: data[0].nationality,
                createdAt: data[0].created_at
            };
        } catch (error) {
            console.error('Error updating player:', error);
            throw error;
        }
    },

    // Delete a single player
    async deletePlayer(id) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }
            
            const { error } = await supabase
                .from('players')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Error deleting player:', error);
            throw error;
        }
    },

    // Delete multiple players
    async deletePlayers(ids) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }
            
            console.log('Deleting players with IDs:', ids);
            
            const { data, error } = await supabase
                .from('players')
                .delete()
                .in('id', ids)
                .select();
            
            console.log('Delete result:', { data, error });
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('Error deleting players:', error);
            throw error;
        }
    },

    // Link a player library entry to a player account
    async linkPlayerToAccount(playerLibraryId, email) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            // First, get the player's details from the library
            const { data: player, error: playerError } = await supabase
                .from('players')
                .select('*')
                .eq('id', playerLibraryId)
                .maybeSingle();

            if (playerError) throw playerError;
            if (!player) throw new Error('Player not found in library');

            // Check if there's a matching player_account with this email
            const { data: account, error: accountError } = await supabase
                .from('player_accounts')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (accountError) throw accountError;
            
            if (!account) {
                return { 
                    success: false, 
                    message: 'No account found with this email. Player must create an account first.' 
                };
            }

            // Update the player_accounts table to link to this player library entry
            const { error: linkError } = await supabase
                .from('player_accounts')
                .update({ account_linked_player_id: playerLibraryId })
                .eq('id', account.id);

            if (linkError) throw linkError;

            return { 
                success: true, 
                message: `Successfully linked to account for ${account.first_name} ${account.last_name} (Player ID: ${account.player_id})`,
                accountPlayerId: account.player_id
            };

        } catch (error) {
            console.error('Error linking player to account:', error);
            throw error;
        }
    },

    // Check if a player library entry is linked to an account
    async checkPlayerAccountLink(playerLibraryId) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await supabase
                .from('player_accounts')
                .select('player_id, first_name, last_name, email')
                .eq('account_linked_player_id', playerLibraryId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                return {
                    isLinked: true,
                    accountPlayerId: data.player_id,
                    accountName: `${data.first_name} ${data.last_name}`,
                    email: data.email
                };
            }

            return { isLinked: false };

        } catch (error) {
            console.error('Error checking player account link:', error);
            throw error;
        }
    },

    // Record match statistics for a player
    async recordMatchStats(matchData) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            console.log('Recording match stats for player:', matchData.player_library_id);
            console.log('Match data:', matchData);

            const { data, error } = await supabase
                .from('match_stats')
                .insert({
                    match_id: matchData.match_id,
                    player_library_id: matchData.player_library_id,
                    opponent_name: matchData.opponent_name,
                    match_date: matchData.match_date,
                    won: matchData.won,
                    legs_won: matchData.legs_won,
                    legs_lost: matchData.legs_lost,
                    sets_won: matchData.sets_won,
                    sets_lost: matchData.sets_lost,
                    total_darts_thrown: matchData.total_darts_thrown,
                    total_score: matchData.total_score,
                    average_3dart: matchData.average_3dart,
                    first_9_average: matchData.first_9_average,
                    highest_checkout: matchData.highest_checkout,
                    checkout_percentage: matchData.checkout_percentage,
                    count_180s: matchData.count_180s || 0,
                    count_171s: matchData.count_171s || 0,
                    count_95s: matchData.count_95s || 0,
                    count_100_plus: matchData.count_100_plus || 0,
                    count_120_plus: matchData.count_120_plus || 0,
                    count_140_plus: matchData.count_140_plus || 0,
                    count_160_plus: matchData.count_160_plus || 0,
                    leg_scores: matchData.leg_scores || [],
                    checkout_history: matchData.checkout_history || []
                })
                .select();

            if (error) {
                console.error('❌ ERROR saving match stats:', error);
                console.error('Error details:', error.message, error.code, error.details);
                throw error;
            }

            console.log('✅ Match stats saved successfully:', data);

            // Update player account lifetime stats if linked
            if (matchData.player_library_id) {
                await this.updatePlayerLifetimeStats(matchData.player_library_id);
            }

            return { success: true, data };

        } catch (error) {
            console.error('Error recording match stats:', error);
            throw error;
        }
    },

    // Update player account lifetime stats
    async updatePlayerLifetimeStats(playerLibraryId) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            // Call the database function to update lifetime stats
            const { error } = await supabase.rpc('update_player_lifetime_stats', {
                p_player_library_id: playerLibraryId
            });

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('Error updating lifetime stats:', error);
            throw error;
        }
    },

    // Get match history for a player
    async getPlayerMatchHistory(playerLibraryId, limit = 20) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await supabase
                .from('match_stats')
                .select('*')
                .eq('player_library_id', playerLibraryId)
                .order('match_date', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Error fetching match history:', error);
            throw error;
        }
    },

    // Get player lifetime stats from account
    async getPlayerLifetimeStats(playerLibraryId) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await supabase
                .from('player_accounts')
                .select('lifetime_stats')
                .eq('account_linked_player_id', playerLibraryId)
                .maybeSingle();

            if (error) throw error;

            return data?.lifetime_stats || null;

        } catch (error) {
            console.error('Error fetching lifetime stats:', error);
            throw error;
        }
    }
};

// Make PlayerDB available globally for ES6 modules
window.PlayerDB = PlayerDB;
window.getSupabaseClient = getSupabaseClient;
window.supabaseConfigReady = true;

// Initialize Supabase client with retry logic
function initializeSupabase() {
    const client = getSupabaseClient();
    if (client) {
        console.log('Supabase client initialized successfully');
        console.log('window.supabaseClient:', window.supabaseClient);
    } else {
        console.log('Waiting for Supabase library to load...');
        setTimeout(initializeSupabase, 100);
    }
}

// Start initialization
initializeSupabase();

console.log('PlayerDB registered on window object');
console.log('window.PlayerDB:', window.PlayerDB);

// ===== GAME STATE SYNC FOR SCOREBOARD =====

let currentMatchId = null;
let currentConnectionCode = null;

// Game State Sync Functions
const GameStateSync = {
    // Generate unique 4-digit connection code
    generateConnectionCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    // Get current connection code
    getConnectionCode() {
        return currentConnectionCode;
    },

    // Get or create session connection code (one code per browser session)
    getOrCreateSessionCode() {
        // Check if we already have a session code
        let sessionCode = sessionStorage.getItem('dartstream-session-code');
        
        if (!sessionCode) {
            // Generate new code and store in session
            sessionCode = this.generateConnectionCode();
            sessionStorage.setItem('dartstream-session-code', sessionCode);
            console.log('🎯 Generated new session code:', sessionCode);
        } else {
            console.log('🔄 Reusing session code:', sessionCode);
        }
        
        currentConnectionCode = sessionCode;
        currentMatchId = 'match_' + currentConnectionCode + '_' + Date.now();
        
        return currentConnectionCode;
    },

    // Start a new match (reuse session code or generate if first time)
    startNewMatch() {
        return this.getOrCreateSessionCode();
    },

    // Generate new code (for manual refresh)
    generateNewCode() {
        // Clear old session code
        sessionStorage.removeItem('dartstream-session-code');
        // Generate new one
        currentConnectionCode = this.generateConnectionCode();
        sessionStorage.setItem('dartstream-session-code', currentConnectionCode);
        currentMatchId = 'match_' + currentConnectionCode + '_' + Date.now();
        console.log('🔄 Manually generated new code:', currentConnectionCode);
        return currentConnectionCode;
    },

    // End match (clear match ID but keep session code)
    endMatch() {
        currentMatchId = null;
        // Don't clear currentConnectionCode - keep it for next match
        console.log('🏁 Match ended, code preserved for session');
    },

    // Send heartbeat to keep match visible in Match Central
    async sendHeartbeat() {
        try {
            const supabase = getSupabaseClient();
            if (!supabase || !currentMatchId || !currentConnectionCode) {
                return;
            }

            // Just update the timestamp to show the match is still active
            await supabase
                .from('game_states')
                .update({ 
                    updated_at: new Date().toISOString()
                })
                .eq('game_id', currentConnectionCode);
            
            console.log('💓 Heartbeat sent');
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    },

    // Sync game state to Supabase for scoreboard
    async syncGameState(state) {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                console.log('⚠️ Supabase not connected, skipping sync');
                return;
            }

            // Only sync if we have a connection code (startNewMatch must be called first)
            if (!currentMatchId || !currentConnectionCode) {
                console.log('⚠️ No connection code - call startNewMatch() first');
                return;
            }

            // Prepare state object for scoreboard
            const scoreboardState = {
                matchId: currentMatchId,
                timestamp: new Date().toISOString(),
                gameStarted: true, // Required for match-central to show the match
                
                // Match settings
                gameType: state.matchSettings?.gameType || '501',
                startType: state.matchSettings?.startType || 'SIDO',
                startScore: state.matchSettings?.startScore || 501,
                
                // Current set/leg info
                currentSet: state.currentSet || 1,
                currentLeg: state.currentLeg || 1,
                
                // Match-central compatible fields
                homePlayerName: state.players?.player1?.name || 'Home',
                awayPlayerName: state.players?.player2?.name || 'Away',
                homeScore: state.players?.player1?.score || 501,
                awayScore: state.players?.player2?.score || 501,
                legs: {
                    home: state.players?.player1?.legWins || 0,
                    away: state.players?.player2?.legWins || 0
                },
                
                // Player 1 data
                player1: {
                    name: state.players?.player1?.name || 'Player 1',
                    nationality: state.players?.player1?.nationality || state.matchSettings?.player1Nationality || '',
                    score: state.players?.player1?.score || 501,
                    legAvg: Math.round((state.players?.player1?.legAvg || 0) * 100) / 100,
                    matchAvg: Math.round((state.players?.player1?.matchAvg || 0) * 100) / 100,
                    legDarts: state.players?.player1?.legDarts || 0,
                    matchDarts: state.players?.player1?.matchDarts || 0,
                    legWins: state.players?.player1?.legWins || 0,
                    setWins: state.players?.player1?.setWins || 0,
                    turnHistory: state.players?.player1?.turnHistory || [],
                    isActive: state.currentPlayer === 1
                },
                
                // Player 2 data
                player2: {
                    name: state.players?.player2?.name || 'Player 2',
                    nationality: state.players?.player2?.nationality || state.matchSettings?.player2Nationality || '',
                    score: state.players?.player2?.score || 501,
                    legAvg: Math.round((state.players?.player2?.legAvg || 0) * 100) / 100,
                    matchAvg: Math.round((state.players?.player2?.matchAvg || 0) * 100) / 100,
                    legDarts: state.players?.player2?.legDarts || 0,
                    matchDarts: state.players?.player2?.matchDarts || 0,
                    legWins: state.players?.player2?.legWins || 0,
                    setWins: state.players?.player2?.setWins || 0,
                    turnHistory: state.players?.player2?.turnHistory || [],
                    isActive: state.currentPlayer === 2
                },
                
                // Game state
                visitNumber: state.visitNumber || 1,
                legStarter: state.legStarter || null,
                currentPlayer: state.currentPlayer || 1,
                currentInput: state.currentInput || '', // Include current input for real-time display
                lastUpdate: Date.now()
            };

            // First, try to update existing row
            const { data: updateData, error: updateError } = await supabase
                .from('game_states')
                .update({
                    game_state: scoreboardState,
                    updated_at: new Date().toISOString()
                })
                .eq('game_id', currentConnectionCode)
                .select();

            // If no rows were updated, insert a new one
            if (updateError || !updateData || updateData.length === 0) {
                const { data: insertData, error: insertError } = await supabase
                    .from('game_states')
                    .insert({
                        id: currentMatchId,
                        game_id: currentConnectionCode,
                        game_state: scoreboardState,
                        updated_at: new Date().toISOString()
                    })
                    .select();

                if (insertError) {
                    console.error('❌ Error inserting to Supabase:', insertError);
                } else {
                    console.log('✅ State inserted to Supabase with code:', currentConnectionCode);
                    console.log('📊 Game state:', scoreboardState);
                }
            } else {
                console.log('✅ State updated in Supabase with code:', currentConnectionCode);
                console.log('📊 Game state:', scoreboardState);
            }
        } catch (error) {
            console.error('❌ Supabase sync error:', error);
        }
    }
};

// Multiplayer Turn Control System
const MultiplayerControl = {
    playerRole: null, // 'player1' or 'player2'
    connectionCode: null,
    realtimeChannel: null,
    isControlLocked: false,
    hasOverrideControl: false,
    gameStarted: false,
    waitingOverlay: null,
    
    // Initialize multiplayer mode
    async initialize(connectionCode, playerRole) {
        this.connectionCode = connectionCode;
        this.playerRole = playerRole; // 'player1' or 'player2'
        
        console.log(`🎮 Initializing multiplayer as ${playerRole} with code ${connectionCode}`);
        
        // Subscribe to real-time game state changes
        await this.subscribeToGameState();
        
        // Set initial control state
        this.updateControlState();
        
        return true;
    },
    
    // Show waiting screen for away player
    showWaitingForHost() {
        if (this.playerRole !== 'player2') return;
        
        // Create waiting overlay
        this.waitingOverlay = document.createElement('div');
        this.waitingOverlay.id = 'waiting-overlay';
        this.waitingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #fff;
        `;
        
        this.waitingOverlay.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
                <h2 style="font-size: 32px; color: #ffd700; margin-bottom: 10px;">Waiting for Host</h2>
                <p style="font-size: 20px; color: #ccc;">Host is setting up match...</p>
                <div style="margin-top: 30px; font-size: 16px; color: #888;">
                    Connected as <strong style="color: #fff;">Away Player</strong>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.waitingOverlay);
        console.log('⏳ Showing waiting screen for away player');
    },
    
    // Hide waiting screen when game starts
    hideWaitingForHost() {
        if (this.waitingOverlay) {
            this.waitingOverlay.remove();
            this.waitingOverlay = null;
            console.log('✅ Game started, hiding waiting screen');
        }
    },
    
    // Initialize multiplayer mode
    async initialize(connectionCode, playerRole) {
        this.connectionCode = connectionCode;
        this.playerRole = playerRole; // 'player1' or 'player2'
        
        console.log(`🎮 Initializing multiplayer as ${playerRole} with code ${connectionCode}`);
        
        // Subscribe to real-time game state changes
        await this.subscribeToGameState();
        
        // Set initial control state
        this.updateControlState();
        
        return true;
    },
    
    // Subscribe to real-time game state updates
    async subscribeToGameState() {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ Supabase client not available');
            return;
        }
        
        // Unsubscribe from existing channel if any
        if (this.realtimeChannel) {
            await supabase.removeChannel(this.realtimeChannel);
        }
        
        // Subscribe to game_states table changes for this connection code
        this.realtimeChannel = supabase
            .channel(`game-${this.connectionCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_states',
                    filter: `game_id=eq.${this.connectionCode}`
                },
                (payload) => {
                    console.log('🔄 Game state update received:', payload);
                    this.handleGameStateUpdate(payload.new.game_state);
                }
            )
            .subscribe((status) => {
                console.log('📡 Realtime subscription status:', status);
            });
    },
    
    // Handle incoming game state updates
    handleGameStateUpdate(newState) {
        if (!window.gameState) return;
        
        console.log('🎯 Processing game state update');
        
        // Check if game has started
        const wasWaiting = !this.gameStarted;
        if (newState.visitNumber > 0 && !this.gameStarted) {
            this.gameStarted = true;
            this.hideWaitingForHost();
            
            // Show the game screen if we were waiting
            if (wasWaiting && typeof window.showScreen === 'function') {
                window.showScreen('game-screen');
            }
        }
        
        // ALWAYS update game state from remote to see real-time changes
        // Update game state from remote
        if (newState.player1) {
            window.gameState.players.player1 = { ...window.gameState.players.player1, ...newState.player1 };
        }
        if (newState.player2) {
            window.gameState.players.player2 = { ...window.gameState.players.player2, ...newState.player2 };
        }
        
        window.gameState.currentPlayer = newState.currentPlayer || 1;
        window.gameState.currentSet = newState.currentSet || 1;
        window.gameState.currentLeg = newState.currentLeg || 1;
        window.gameState.visitNumber = newState.visitNumber || 1;
        
        // Also update current input if opponent is typing (for real-time display)
        if (newState.currentInput !== undefined) {
            window.gameState.currentInput = newState.currentInput;
        }
        
        // Refresh UI to show all changes
        if (typeof window.updateGameUI === 'function') {
            window.updateGameUI();
        }
        
        // Update control state (lock/unlock inputs)
        this.updateControlState();
    },
    
    // Check if it's our turn
    isOurTurn(state = window.gameState) {
        if (!this.playerRole || !state) return false;
        
        const currentPlayerNum = state.currentPlayer;
        const ourPlayerNum = this.playerRole === 'player1' ? 1 : 2;
        
        return currentPlayerNum === ourPlayerNum;
    },
    
    // Take control override
    takeControl() {
        this.hasOverrideControl = true;
        this.isControlLocked = false;
        console.log('🎮 Override control taken');
        this.updateControlUI(true);
    },
    
    // Release control override (on submit)
    releaseControl() {
        this.hasOverrideControl = false;
        console.log('🎮 Override control released');
        
        // Sync the game state when releasing control
        if (typeof window.GameStateSync !== 'undefined' && window.gameState) {
            window.GameStateSync.syncGameState(window.gameState);
        }
        
        this.updateControlState();
    },
    
    // Update control state (lock/unlock inputs)
    updateControlState() {
        if (this.hasOverrideControl) {
            return; // Keep control until released
        }
        
        const isOurTurn = this.isOurTurn();
        
        // Automatically grant control if it's our turn and game has started
        if (isOurTurn && this.gameStarted) {
            this.isControlLocked = false;
        } else {
            this.isControlLocked = !isOurTurn;
        }
        
        // Update UI to show lock/unlock state
        this.updateControlUI(isOurTurn);
        
        console.log(`🎮 Controls ${isOurTurn ? 'UNLOCKED' : 'LOCKED'} - ${isOurTurn ? 'YOUR TURN' : 'OPPONENT TURN'}`);
    },
    
    // Update UI to show control state
    updateControlUI(isOurTurn) {
        const inputMode = document.getElementById('input-mode');
        if (!inputMode) return;
        
        if (!this.playerRole) {
            // Single player mode - always enabled
            inputMode.style.background = 'transparent';
            inputMode.style.color = '#ffffff';
            inputMode.style.cursor = 'default';
            return;
        }
        
        if (isOurTurn || this.hasOverrideControl) {
            // Your turn or have control - normal appearance
            inputMode.style.background = 'transparent';
            inputMode.style.color = '#ffffff';
            inputMode.style.cursor = 'default';
            inputMode.onclick = null;
            
            // Enable buttons
            const numberButtons = document.querySelectorAll('.num-btn');
            const inputButtons = document.querySelectorAll('.input-btn');
            
            numberButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            inputButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
        } else {
            // Opponent's turn - show "Take Control" button
            inputMode.style.background = '#ffd700';
            inputMode.style.color = '#000';
            inputMode.style.cursor = 'pointer';
            inputMode.textContent = 'TAKE CONTROL';
            inputMode.onclick = () => this.takeControl();
            
            // Disable buttons
            const numberButtons = document.querySelectorAll('.num-btn');
            const inputButtons = document.querySelectorAll('.input-btn');
            
            numberButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            });
            
            inputButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            });
        }
    },
    
    // Check if action is allowed
    canTakeAction() {
        if (!this.playerRole) {
            return true; // Single player mode
        }
        
        if (this.hasOverrideControl) {
            return true; // Has override control
        }
        
        if (this.isControlLocked) {
            console.log('⛔ Action blocked - not your turn (click input box to take control)');
            return false;
        }
        
        return true;
    },
    
    // Cleanup
    async disconnect() {
        const supabase = getSupabaseClient();
        if (supabase && this.realtimeChannel) {
            await supabase.removeChannel(this.realtimeChannel);
        }
        
        this.playerRole = null;
        this.connectionCode = null;
        this.realtimeChannel = null;
        this.isControlLocked = false;
        this.hasOverrideControl = false;
    }
};

// Make GameStateSync and MultiplayerControl available globally
window.GameStateSync = GameStateSync;
window.MultiplayerControl = MultiplayerControl;
