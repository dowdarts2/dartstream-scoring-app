// Match Connection Handler
const ConnectionHandler = {
    modal: null,
    currentCode: null,

    initialize() {
        this.modal = document.getElementById('connection-modal');
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Connect button on starting player screen
        const connectBtn = document.getElementById('connect-match-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.openModal());
        }

        // Generate code button
        const generateBtn = document.getElementById('generate-code-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateCode());
        }

        // Connect to match button
        const connectToMatchBtn = document.getElementById('connect-to-match-btn');
        if (connectToMatchBtn) {
            connectToMatchBtn.addEventListener('click', () => this.showConnectInput());
        }

        // Done button (after generating code)
        const doneBtn = document.getElementById('code-done-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => this.closeModal());
        }

        // Confirm connect button
        const confirmBtn = document.getElementById('confirm-connect-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.connectToMatch());
        }

        // Cancel connect button
        const cancelBtn = document.getElementById('cancel-connect-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.showInitialOptions());
        }

        // Close modal button
        const closeBtn = document.getElementById('close-connection-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close modal when clicking outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Auto-format code input (numbers only)
        const codeInput = document.getElementById('connect-code-input');
        if (codeInput) {
            codeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });

            // Submit on Enter key
            codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.length === 4) {
                    this.connectToMatch();
                }
            });
        }
    },

    openModal() {
        this.showInitialOptions();
        this.modal.style.display = 'flex';
    },

    closeModal() {
        this.modal.style.display = 'none';
        this.showInitialOptions();
    },

    showInitialOptions() {
        document.getElementById('connection-options').style.display = 'flex';
        document.getElementById('generated-code-display').style.display = 'none';
        document.getElementById('connect-input-display').style.display = 'none';
    },

    async generateCode() {
        // Use GameStateSync to generate code
        if (typeof window.GameStateSync !== 'undefined') {
            this.currentCode = window.GameStateSync.startNewMatch();
        } else {
            // Fallback code generation
            this.currentCode = Math.floor(1000 + Math.random() * 9000).toString();
        }

        // Display the code
        document.getElementById('display-connection-code').textContent = this.currentCode;

        // Show generated code display
        document.getElementById('connection-options').style.display = 'none';
        document.getElementById('generated-code-display').style.display = 'block';
        document.getElementById('connect-input-display').style.display = 'none';

        // Update connection code displays in the app
        this.updateConnectionCodeDisplays(this.currentCode);

        // Initialize as HOST (player1)
        if (typeof window.MultiplayerControl !== 'undefined') {
            await window.MultiplayerControl.initialize(this.currentCode, 'player1');
        }

        console.log('🔢 Generated connection code:', this.currentCode, '(HOST - Player 1)');
    },

    showConnectInput() {
        document.getElementById('connection-options').style.display = 'none';
        document.getElementById('generated-code-display').style.display = 'none';
        document.getElementById('connect-input-display').style.display = 'block';

        // Focus the input
        setTimeout(() => {
            document.getElementById('connect-code-input').focus();
        }, 100);
    },

    async connectToMatch() {
        const input = document.getElementById('connect-code-input');
        const code = input.value.trim();

        if (code.length !== 4) {
            alert('Please enter a valid 4-digit code');
            return;
        }

        this.currentCode = code;

        // Update connection code displays
        this.updateConnectionCodeDisplays(code);

        // Initialize as AWAY player (player2)
        if (typeof window.MultiplayerControl !== 'undefined') {
            await window.MultiplayerControl.initialize(code, 'player2');
            // Show waiting screen for away player
            window.MultiplayerControl.showWaitingForHost();
        }

        console.log('🔗 Connected to match with code:', code, '(AWAY - Player 2)');

        // Close modal
        this.closeModal();

        // Show success message
        this.showConnectionSuccess();
    },

    updateConnectionCodeDisplays(code) {
        // Update all connection code displays in the app
        const displays = [
            document.getElementById('connection-code-display'),
            document.getElementById('connection-code-display-3')
        ];

        displays.forEach(display => {
            if (display) {
                display.textContent = code;
            }
        });
    },

    showConnectionSuccess() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2d5016;
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        message.textContent = '✅ Connected to match!';
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 2000);
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ConnectionHandler.initialize();
    });
} else {
    ConnectionHandler.initialize();
}

// Make available globally
window.ConnectionHandler = ConnectionHandler;
