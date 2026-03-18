import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import gameState from '../GameState';
import { TITLE_SCREEN_SUBTITLE, TITLE_SCREEN_TAGLINE, CHARACTER_TYPES, CHARACTER_CONTEXT_PLACEHOLDER, CHARACTER_CONTEXT_MAX_LENGTH } from '../../constants.js';
import { fetchLocationData } from '../../services/google-maps.js';
import { generateTilemap } from '../MapGenerator.js';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
        this.playerName = '';
        this.nameInput = null;
        this.nameInputText = null;
        this.nameInputBg = null;
        this.nameInputCursor = null;
        this.cursorBlinkTimer = null;
        this.music = null;
        this.isInputFocused = false;

        // Character selection state
        this.selectedCharacterType = null;
        this.characterCards = [];
        this.characterCardBgs = [];

        // Context input state
        this.characterContext = '';
        this.contextInputText = null;
        this.contextInputBg = null;
        this.contextInputCursor = null;
        this.contextCursorBlinkTimer = null;
        this.isContextFocused = false;

        // Location input state
        this.mapLocation = '';
        this.locationInputText = null;
        this.locationInputBg = null;
        this.locationInputCursor = null;
        this.locationCursorBlinkTimer = null;
        this.isLocationFocused = false;
    }

    create ()
    {
        // Initialize game state
        gameState.init();

        // Add scene shutdown listener to clean up DOM elements
        this.events.on('shutdown', this.cleanup, this);

        // Ensure fonts are loaded for canvas rendering
        // Small delay to let canvas context register the font
        this.time.delayedCall(100, () => {
            this.createMainMenu();
        });
    }

    cleanup ()
    {
        // Remove Phaser input elements
        if (this.nameInputText) {
            this.nameInputText.destroy();
            this.nameInputText = null;
        }
        if (this.nameInputBg) {
            this.nameInputBg.destroy();
            this.nameInputBg = null;
        }
        if (this.nameInputCursor) {
            this.nameInputCursor.destroy();
            this.nameInputCursor = null;
        }
        if (this.cursorBlinkTimer) {
            this.cursorBlinkTimer.remove();
            this.cursorBlinkTimer = null;
        }

        // Clean up context input elements
        if (this.contextInputText) {
            this.contextInputText.destroy();
            this.contextInputText = null;
        }
        if (this.contextInputBg) {
            this.contextInputBg.destroy();
            this.contextInputBg = null;
        }
        if (this.contextInputCursor) {
            this.contextInputCursor.destroy();
            this.contextInputCursor = null;
        }
        if (this.contextCursorBlinkTimer) {
            this.contextCursorBlinkTimer.remove();
            this.contextCursorBlinkTimer = null;
        }

        // Clean up location input elements
        if (this.locationInputText) {
            this.locationInputText.destroy();
            this.locationInputText = null;
        }
        if (this.locationInputBg) {
            this.locationInputBg.destroy();
            this.locationInputBg = null;
        }
        if (this.locationInputCursor) {
            this.locationInputCursor.destroy();
            this.locationInputCursor = null;
        }
        if (this.locationCursorBlinkTimer) {
            this.locationCursorBlinkTimer.remove();
            this.locationCursorBlinkTimer = null;
        }

        // Clean up character card references
        this.characterCards = [];
        this.characterCardBgs = [];

        // Remove keyboard listeners
        this.input.keyboard.off('keydown', this.handleKeyDown, this);

        // Double check for any lingering DOM inputs
        const existingInput = document.getElementById('player-name-input');
        if (existingInput) {
            existingInput.remove();
        }

        // Remove mobile input if exists
        const mobileInput = document.getElementById('mobile-name-input');
        if (mobileInput) {
            mobileInput.remove();
        }

        // Remove mobile context input if exists
        const mobileContextInput = document.getElementById('mobile-context-input');
        if (mobileContextInput) {
            mobileContextInput.remove();
        }

        // Remove mobile location input if exists
        const mobileLocationInput = document.getElementById('mobile-location-input');
        if (mobileLocationInput) {
            mobileLocationInput.remove();
        }

        // Stop music
        if (this.music) {
            this.music.stop();
        }
    }

    createMainMenu ()
    {
        // Clean up any existing HTML inputs first (in case scene was restarted)
        const existingInput = document.getElementById('player-name-input');
        if (existingInput) {
            existingInput.remove();
        }
        
        // Also remove any inputs that might have been created
        const allInputs = document.querySelectorAll('input[id="player-name-input"]');
        allInputs.forEach(input => input.remove());

        // Start menu music
        if (!this.music || !this.music.isPlaying) {
            this.music = this.sound.add('menu-music', {
                loop: true,
                volume: 0.5
            });
            this.music.play();
        }

        // Vibrant outdoor gradient background - Sky to grass like the logo
        const graphics = this.add.graphics();
        // Sky blue to bright green gradient (matching logo's outdoor vibe)
        graphics.fillGradientStyle(0x4A90E2, 0x5FB3E8, 0x6BC97C, 0x4CAF50, 1);
        graphics.fillRect(0, 0, this.scale.width, this.scale.height);

        // Add nature-themed animated particles
        this.createParticleField();

        // Subtle overlay for depth
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.15);
        overlay.fillRect(0, 0, this.scale.width, this.scale.height);

        // Logo - reduced size and proper positioning
        const logoY = 80;
        const logo = this.add.image(this.scale.width / 2, logoY, 'logo');
        logo.setScale(0.17);

        // Logo glow effect - golden/sunny glow matching logo
        const logoGlow = this.add.image(this.scale.width / 2, logoY, 'logo');
        logoGlow.setScale(0.19);
        logoGlow.setTint(0xFFD700);
        logoGlow.setAlpha(0.3);
        logoGlow.setDepth(-1);

        // Logo floating animation
        this.tweens.add({
            targets: [logo, logoGlow],
            y: { from: logoY, to: logoY - 4 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Logo glow pulse
        this.tweens.add({
            targets: logoGlow,
            alpha: { from: 0.3, to: 0.5 },
            scale: { from: 0.21, to: 0.23 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Info text - warm golden color matching logo (reduced sizes)
        this.add.text(this.scale.width / 2, 160, TITLE_SCREEN_SUBTITLE, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#FFE066',
            align: 'center',
            stroke: '#8B4513',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 182, TITLE_SCREEN_TAGLINE, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFFFFF',
            align: 'center',
            stroke: '#2D5016',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Name input label
        this.add.text(this.scale.width / 2, 218, 'ENTER YOUR NAME:', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFD700',
            letterSpacing: 2,
            stroke: '#2D5016',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Create Phaser-based input for name
        this.createNameInput();

        // Character class selection
        this.add.text(this.scale.width / 2, 298, 'CHOOSE YOUR CLASS:', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFD700',
            letterSpacing: 2,
            stroke: '#2D5016',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.createCharacterSelection();

        // Context input
        this.add.text(this.scale.width / 2, 410, 'CHARACTER CONTEXT (OPTIONAL):', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#FFD700',
            letterSpacing: 1,
            stroke: '#2D5016',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.createContextInput();

        // Location input for dynamic map generation
        this.add.text(this.scale.width / 2, 472, 'MAP LOCATION (OPTIONAL):', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#FFD700',
            letterSpacing: 1,
            stroke: '#2D5016',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.createLocationInput();

        // Start button - vibrant Pokemon-style
        const buttonY = 545;
        const buttonWidth = 380;
        const buttonHeight = 58;

        // Button glow - golden glow
        const buttonGlow = this.add.graphics();
        buttonGlow.fillStyle(0xFFD700, 0.3);
        buttonGlow.fillRoundedRect(this.scale.width / 2 - buttonWidth / 2 - 6, buttonY - buttonHeight / 2 - 6, buttonWidth + 12, buttonHeight + 12, 18);

        this.tweens.add({
            targets: buttonGlow,
            alpha: { from: 0.3, to: 0.6 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Button background - bright green with gold border
        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0x5FB859, 1); // Bright green from logo
        buttonBg.fillRoundedRect(this.scale.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);
        buttonBg.lineStyle(5, 0xFFD700, 1); // Gold border
        buttonBg.strokeRoundedRect(this.scale.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);

        const newGameButton = this.add.rectangle(this.scale.width / 2, buttonY, buttonWidth, buttonHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        const newGameText = this.add.text(this.scale.width / 2, buttonY, 'START GAME', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#FFFFFF',
            letterSpacing: 3,
            stroke: '#2D5016',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Store button elements
        this.newGameButton = { button: newGameButton, bg: buttonBg, text: newGameText, glow: buttonGlow };

        newGameButton.on('pointerover', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x4FA050, 1); // Darker green on hover
            buttonBg.fillRoundedRect(this.scale.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);
            buttonBg.lineStyle(5, 0xFFE066, 1); // Bright yellow border on hover
            buttonBg.strokeRoundedRect(this.scale.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);
            newGameText.setColor('#FFE066'); // Yellow text
            newGameText.setScale(1.03);
        });

        newGameButton.on('pointerout', () => {
            buttonBg.clear();
            buttonBg.fillStyle(0x5FB859, 1);
            buttonBg.fillRoundedRect(this.scale.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);
            buttonBg.lineStyle(5, 0xFFD700, 1);
            buttonBg.strokeRoundedRect(this.scale.width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);
            newGameText.setColor('#FFFFFF');
            newGameText.setScale(1);
        });

        newGameButton.on('pointerdown', () => {
            this.changeScene();
        });

        // Version text
        this.add.text(this.scale.width / 2, 610, 'v0.5 • BUILT WITH PHASER 3', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: 1,
            stroke: 'rgba(45, 80, 22, 0.8)',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Global mute/unmute control
        EventBus.on('toggle-mute', (isMuted) => {
            if (this.sound && this.sound.context) {
                this.sound.mute = isMuted;
            }
        });

        EventBus.emit('current-scene-ready', this);
    }

    createParticleField ()
    {
        // Create floating particles with nature colors from logo
        const particles = [];
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            const size = Phaser.Math.FloatBetween(2, 5);
            // Nature colors: yellow sun sparkles, white clouds, green leaves
            const colors = [0xFFD700, 0xFFF8DC, 0x90EE90, 0xFFE066];
            const color = Phaser.Math.RND.pick(colors);

            const particle = this.add.circle(x, y, size, color, 0.4);
            particles.push(particle);

            // Animate particle floating
            this.tweens.add({
                targets: particle,
                y: y - Phaser.Math.Between(50, 150),
                alpha: { from: 0.4, to: 0 },
                duration: Phaser.Math.Between(3000, 6000),
                delay: Phaser.Math.Between(0, 3000),
                repeat: -1,
                onRepeat: () => {
                    particle.y = this.scale.height + 10;
                    particle.x = Phaser.Math.Between(0, this.scale.width);
                }
            });
        }
    }

    createScanlines ()
    {
        // Create CRT scanline effect
        const scanlines = this.add.graphics();
        scanlines.setAlpha(0.05);

        for (let y = 0; y < this.scale.height; y += 4) {
            scanlines.lineStyle(1, 0x000000, 1);
            scanlines.lineBetween(0, y, this.scale.width, y);
        }

        // Animate scanline moving
        this.tweens.add({
            targets: scanlines,
            y: { from: 0, to: 4 },
            duration: 100,
            repeat: -1,
            ease: 'Linear'
        });
    }

    createNameInput ()
    {
        // Ensure no old Phaser input elements exist
        if (this.nameInputBg) {
            this.nameInputBg.destroy();
        }
        if (this.nameInputText) {
            this.nameInputText.destroy();
        }
        if (this.nameInputCursor) {
            this.nameInputCursor.destroy();
        }
        if (this.cursorBlinkTimer) {
            this.cursorBlinkTimer.remove();
        }

        const inputX = this.scale.width / 2;
        const inputY = 255;
        const inputWidth = 340;
        const inputHeight = 36;

        // Create input background with glow effect
        this.nameInputBg = this.add.graphics();
        this.updateInputBackground(false);

        // Create input text
        const savedName = gameState.getPlayerName();
        const initialText = (savedName && savedName !== 'Player') ? savedName : '';
        this.playerName = initialText;

        this.nameInputText = this.add.text(inputX, inputY, initialText || 'TRAINER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: initialText ? '#FFFFFF' : '#BBBBBB',
            letterSpacing: 3,
            align: 'center'
        }).setOrigin(0.5);

        // Create blinking cursor
        this.nameInputCursor = this.add.text(inputX, inputY, '|', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#FFD700',
            letterSpacing: 3
        }).setOrigin(0.5, 0.5);
        this.nameInputCursor.setVisible(false);

        // Make input area interactive
        const inputZone = this.add.rectangle(inputX, inputY, inputWidth, inputHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        inputZone.on('pointerdown', () => {
            this.blurContextInput(); // Blur context input if focused
            this.focusInput();
            const isMobile = this.sys.game.device.input.touch || window.innerWidth <= 1024;
            if (isMobile) {
                this.createAndFocusMobileInput();
            }
        });

        // Make entire scene clickable to blur inputs when clicking outside
        this.input.on('pointerdown', (pointer) => {
            const nameBounds = {
                x: inputX - inputWidth / 2,
                y: inputY - inputHeight / 2,
                width: inputWidth,
                height: inputHeight
            };
            const contextBounds = {
                x: this.scale.width / 2 - 250,
                y: 438 - 14,
                width: 500,
                height: 28
            };
            const locationBounds = {
                x: this.scale.width / 2 - 250,
                y: 500 - 14,
                width: 500,
                height: 28
            };

            const inName = pointer.x >= nameBounds.x && pointer.x <= nameBounds.x + nameBounds.width &&
                           pointer.y >= nameBounds.y && pointer.y <= nameBounds.y + nameBounds.height;
            const inContext = pointer.x >= contextBounds.x && pointer.x <= contextBounds.x + contextBounds.width &&
                             pointer.y >= contextBounds.y && pointer.y <= contextBounds.y + contextBounds.height;
            const inLocation = pointer.x >= locationBounds.x && pointer.x <= locationBounds.x + locationBounds.width &&
                               pointer.y >= locationBounds.y && pointer.y <= locationBounds.y + locationBounds.height;

            if (!inName && this.isInputFocused) {
                this.blurInput();
            }
            if (!inContext && this.isContextFocused) {
                this.blurContextInput();
            }
            if (!inLocation && this.isLocationFocused) {
                this.blurLocationInput();
            }
        });

        // Keyboard input handling
        this.input.keyboard.on('keydown', this.handleKeyDown, this);

        // Auto-focus on scene start
        this.time.delayedCall(200, () => {
            this.focusInput();
        });

        // Start cursor blink animation
        this.startCursorBlink();
    }

    updateInputBackground (isFocused)
    {
        this.nameInputBg.clear();

        const inputX = this.scale.width / 2;
        const inputY = 255;
        const inputWidth = 340;
        const inputHeight = 36;
        const borderRadius = 14;
        const borderWidth = 4;

        // Outer glow
        if (isFocused) {
            this.nameInputBg.fillStyle(0xFFD700, 0.4);
            this.nameInputBg.fillRoundedRect(
                inputX - inputWidth / 2 - 8,
                inputY - inputHeight / 2 - 8,
                inputWidth + 16,
                inputHeight + 16,
                borderRadius + 4
            );
        }

        // Background
        this.nameInputBg.fillStyle(isFocused ? 0x5FB859 : 0x5FB859, isFocused ? 1 : 0.9);
        this.nameInputBg.fillRoundedRect(
            inputX - inputWidth / 2,
            inputY - inputHeight / 2,
            inputWidth,
            inputHeight,
            borderRadius
        );

        // Border
        this.nameInputBg.lineStyle(borderWidth, isFocused ? 0xFFFFFF : 0xFFD700, 1);
        this.nameInputBg.strokeRoundedRect(
            inputX - inputWidth / 2,
            inputY - inputHeight / 2,
            inputWidth,
            inputHeight,
            borderRadius
        );

        // Inner shadow
        this.nameInputBg.fillStyle(0x2D5016, isFocused ? 0.2 : 0.3);
        this.nameInputBg.fillRoundedRect(
            inputX - inputWidth / 2 + 2,
            inputY - inputHeight / 2 + 2,
            inputWidth - 4,
            inputHeight - 4,
            borderRadius - 2
        );
    }

    createAndFocusMobileInput ()
    {
        // Remove any existing mobile input
        const existingInput = document.getElementById('mobile-name-input');
        if (existingInput) {
            existingInput.remove();
        }

        // Create hidden input for mobile keyboard
        const mobileInput = document.createElement('input');
        mobileInput.id = 'mobile-name-input';
        mobileInput.type = 'text';
        mobileInput.value = this.playerName;
        mobileInput.maxLength = 15;
        mobileInput.style.position = 'fixed';
        mobileInput.style.top = '-100px';
        mobileInput.style.left = '-100px';
        mobileInput.style.opacity = '0';
        mobileInput.style.pointerEvents = 'none';
        document.body.appendChild(mobileInput);

        // Handle input changes
        mobileInput.addEventListener('input', (e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
            this.playerName = value;
            this.updateInputText();
            mobileInput.value = value;
        });

        // Handle blur
        mobileInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.getElementById('mobile-name-input')) {
                    document.getElementById('mobile-name-input').remove();
                }
            }, 100);
        });

        // Focus the input to trigger mobile keyboard
        setTimeout(() => {
            mobileInput.focus();
        }, 100);
    }

    focusInput ()
    {
        this.isInputFocused = true;
        this.updateInputBackground(true);
        this.nameInputText.setColor('#FFD700');
        if (this.playerName === '') {
            this.nameInputText.setText('');
        }
        this.startCursorBlink();
    }

    blurInput ()
    {
        this.isInputFocused = false;
        this.updateInputBackground(false);
        this.nameInputText.setColor(this.playerName ? '#FFFFFF' : '#BBBBBB');
        if (this.playerName === '') {
            this.nameInputText.setText('TRAINER');
        }
        this.nameInputCursor.setVisible(false);
        if (this.cursorBlinkTimer) {
            this.cursorBlinkTimer.remove();
            this.cursorBlinkTimer = null;
        }
    }

    startCursorBlink ()
    {
        if (!this.isInputFocused) return;

        if (this.cursorBlinkTimer) {
            this.cursorBlinkTimer.remove();
        }

        this.nameInputCursor.setVisible(true);
        this.updateCursorPosition();

        this.cursorBlinkTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.nameInputCursor) {
                    this.nameInputCursor.setVisible(!this.nameInputCursor.visible);
                }
            },
            loop: true
        });
    }

    updateCursorPosition ()
    {
        if (!this.nameInputText || !this.nameInputCursor) return;

        const textWidth = this.nameInputText.width;
        const inputX = this.scale.width / 2;
        const cursorX = inputX + textWidth / 2 + 4;
        this.nameInputCursor.setX(cursorX);
    }

    handleKeyDown (event)
    {
        // Handle Tab to cycle between inputs
        if (event.keyCode === 9) { // Tab
            event.preventDefault();
            if (this.isInputFocused) {
                this.blurInput();
                this.focusContextInput();
            } else if (this.isContextFocused) {
                this.blurContextInput();
                this.focusLocationInput();
            } else if (this.isLocationFocused) {
                this.blurLocationInput();
                this.focusInput();
            }
            return;
        }

        // Name input handling
        if (this.isInputFocused) {
            if (event.keyCode === 13) {
                this.changeScene();
                return;
            }
            if (event.keyCode === 8) {
                if (this.playerName.length > 0) {
                    this.playerName = this.playerName.slice(0, -1);
                    this.updateInputText();
                }
                return;
            }
            if (event.keyCode >= 32 && event.keyCode <= 126) {
                const char = event.key;
                if (/^[A-Za-z0-9 ]$/.test(char) && this.playerName.length < 15) {
                    this.playerName += char.toUpperCase();
                    this.updateInputText();
                }
            }
            return;
        }

        // Context input handling
        if (this.isContextFocused) {
            if (event.keyCode === 13) {
                this.changeScene();
                return;
            }
            if (event.keyCode === 8) {
                if (this.characterContext.length > 0) {
                    this.characterContext = this.characterContext.slice(0, -1);
                    this.updateContextInputText();
                }
                return;
            }
            if (event.keyCode >= 32 && event.keyCode <= 126) {
                const char = event.key;
                if (this.characterContext.length < CHARACTER_CONTEXT_MAX_LENGTH) {
                    this.characterContext += char;
                    this.updateContextInputText();
                }
            }
            return;
        }

        // Location input handling
        if (this.isLocationFocused) {
            if (event.keyCode === 13) {
                this.changeScene();
                return;
            }
            if (event.keyCode === 8) {
                if (this.mapLocation.length > 0) {
                    this.mapLocation = this.mapLocation.slice(0, -1);
                    this.updateLocationInputText();
                }
                return;
            }
            if (event.keyCode >= 32 && event.keyCode <= 126) {
                const char = event.key;
                if (this.mapLocation.length < 200) {
                    this.mapLocation += char;
                    this.updateLocationInputText();
                }
            }
        }
    }

    updateInputText ()
    {
        if (this.playerName === '') {
            this.nameInputText.setText('TRAINER');
            this.nameInputText.setColor('#BBBBBB');
        } else {
            this.nameInputText.setText(this.playerName);
            this.nameInputText.setColor(this.isInputFocused ? '#FFD700' : '#FFFFFF');
        }
        this.updateCursorPosition();
    }

    // ─── Character Selection ────────────────────────────────────
    createCharacterSelection ()
    {
        const centerX = this.scale.width / 2;
        const cardY = 348;
        const cardWidth = 140;
        const cardHeight = 52;
        const gap = 12;
        const totalWidth = CHARACTER_TYPES.length * cardWidth + (CHARACTER_TYPES.length - 1) * gap;
        const startX = centerX - totalWidth / 2 + cardWidth / 2;

        // Load saved character type
        const savedType = gameState.getCharacterType();
        this.selectedCharacterType = savedType;

        CHARACTER_TYPES.forEach((charType, index) => {
            const x = startX + index * (cardWidth + gap);
            const isSelected = savedType === charType.id;

            // Card background
            const cardBg = this.add.graphics();
            this.drawCharacterCard(cardBg, x, cardY, cardWidth, cardHeight, charType.tint, isSelected);

            // Character name
            const nameText = this.add.text(x, cardY - 8, charType.name.toUpperCase(), {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: isSelected ? '#FFFFFF' : '#DDDDDD',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);

            // Description
            const descText = this.add.text(x, cardY + 10, charType.description, {
                fontFamily: '"Press Start 2P"',
                fontSize: '6px',
                color: isSelected ? '#FFE066' : '#AAAAAA',
                align: 'center'
            }).setOrigin(0.5);

            // Interactive zone
            const zone = this.add.rectangle(x, cardY, cardWidth, cardHeight, 0x000000, 0)
                .setInteractive({ useHandCursor: true });

            // Store references
            this.characterCards.push({ zone, bg: cardBg, nameText, descText, type: charType });

            zone.on('pointerover', () => {
                if (this.selectedCharacterType !== charType.id) {
                    this.drawCharacterCard(cardBg, x, cardY, cardWidth, cardHeight, charType.tint, false, true);
                }
            });

            zone.on('pointerout', () => {
                if (this.selectedCharacterType !== charType.id) {
                    this.drawCharacterCard(cardBg, x, cardY, cardWidth, cardHeight, charType.tint, false, false);
                }
            });

            zone.on('pointerdown', () => {
                this.selectCharacter(charType.id);
            });
        });
    }

    drawCharacterCard (graphics, x, y, w, h, tint, isSelected, isHover = false)
    {
        graphics.clear();

        // Glow for selected
        if (isSelected) {
            graphics.fillStyle(tint, 0.5);
            graphics.fillRoundedRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 12);
        }

        // Background
        const alpha = isSelected ? 0.9 : (isHover ? 0.6 : 0.4);
        graphics.fillStyle(tint, alpha);
        graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);

        // Border
        const borderColor = isSelected ? 0xFFFFFF : (isHover ? 0xFFD700 : 0x666666);
        const borderWidth = isSelected ? 3 : 2;
        graphics.lineStyle(borderWidth, borderColor, 1);
        graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    }

    selectCharacter (typeId)
    {
        // Toggle: clicking the same character deselects
        if (this.selectedCharacterType === typeId) {
            this.selectedCharacterType = null;
        } else {
            this.selectedCharacterType = typeId;
        }

        // Update all card visuals
        this.characterCards.forEach(card => {
            const isSelected = this.selectedCharacterType === card.type.id;
            const centerX = this.scale.width / 2;
            const cardWidth = 140;
            const cardHeight = 52;
            const gap = 12;
            const totalWidth = CHARACTER_TYPES.length * cardWidth + (CHARACTER_TYPES.length - 1) * gap;
            const startX = centerX - totalWidth / 2 + cardWidth / 2;
            const idx = CHARACTER_TYPES.findIndex(t => t.id === card.type.id);
            const x = startX + idx * (cardWidth + gap);

            this.drawCharacterCard(card.bg, x, 348, cardWidth, cardHeight, card.type.tint, isSelected);
            card.nameText.setColor(isSelected ? '#FFFFFF' : '#DDDDDD');
            card.descText.setColor(isSelected ? '#FFE066' : '#AAAAAA');
        });
    }

    // ─── Context Input ───────────────────────────────────────────
    createContextInput ()
    {
        const inputX = this.scale.width / 2;
        const inputY = 438;
        const inputWidth = 500;
        const inputHeight = 28;

        // Load saved context
        const savedContext = gameState.getCharacterContext();
        this.characterContext = savedContext || '';

        // Background
        this.contextInputBg = this.add.graphics();
        this.updateContextInputBackground(false);

        // Text
        this.contextInputText = this.add.text(inputX, inputY,
            this.characterContext || CHARACTER_CONTEXT_PLACEHOLDER, {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: this.characterContext ? '#FFFFFF' : '#888888',
            letterSpacing: 1,
            align: 'center',
            wordWrap: { width: inputWidth - 20 }
        }).setOrigin(0.5);

        // Cursor
        this.contextInputCursor = this.add.text(inputX, inputY, '|', {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#FFD700'
        }).setOrigin(0.5, 0.5);
        this.contextInputCursor.setVisible(false);

        // Interactive zone
        const zone = this.add.rectangle(inputX, inputY, inputWidth, inputHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerdown', () => {
            this.blurInput();
            this.blurLocationInput();
            this.focusContextInput();
            const isMobile = this.sys.game.device.input.touch || window.innerWidth <= 1024;
            if (isMobile) {
                this.createAndFocusMobileContextInput();
            }
        });
    }

    updateContextInputBackground (isFocused)
    {
        this.contextInputBg.clear();

        const inputX = this.scale.width / 2;
        const inputY = 450;
        const inputWidth = 500;
        const inputHeight = 32;
        const borderRadius = 10;

        if (isFocused) {
            this.contextInputBg.fillStyle(0xFFD700, 0.3);
            this.contextInputBg.fillRoundedRect(
                inputX - inputWidth / 2 - 4, inputY - inputHeight / 2 - 4,
                inputWidth + 8, inputHeight + 8, borderRadius + 2
            );
        }

        this.contextInputBg.fillStyle(0x5FB859, isFocused ? 1 : 0.9);
        this.contextInputBg.fillRoundedRect(
            inputX - inputWidth / 2, inputY - inputHeight / 2,
            inputWidth, inputHeight, borderRadius
        );

        this.contextInputBg.lineStyle(2, isFocused ? 0xFFFFFF : 0xFFD700, 1);
        this.contextInputBg.strokeRoundedRect(
            inputX - inputWidth / 2, inputY - inputHeight / 2,
            inputWidth, inputHeight, borderRadius
        );

        this.contextInputBg.fillStyle(0x2D5016, isFocused ? 0.2 : 0.3);
        this.contextInputBg.fillRoundedRect(
            inputX - inputWidth / 2 + 2, inputY - inputHeight / 2 + 2,
            inputWidth - 4, inputHeight - 4, borderRadius - 2
        );
    }

    focusContextInput ()
    {
        this.isContextFocused = true;
        this.updateContextInputBackground(true);
        this.contextInputText.setColor('#FFD700');
        if (this.characterContext === '') {
            this.contextInputText.setText('');
        }
        this.startContextCursorBlink();
    }

    blurContextInput ()
    {
        this.isContextFocused = false;
        this.updateContextInputBackground(false);
        this.contextInputText.setColor(this.characterContext ? '#FFFFFF' : '#888888');
        if (this.characterContext === '') {
            this.contextInputText.setText(CHARACTER_CONTEXT_PLACEHOLDER);
        }
        if (this.contextInputCursor) {
            this.contextInputCursor.setVisible(false);
        }
        if (this.contextCursorBlinkTimer) {
            this.contextCursorBlinkTimer.remove();
            this.contextCursorBlinkTimer = null;
        }
    }

    startContextCursorBlink ()
    {
        if (!this.isContextFocused) return;
        if (this.contextCursorBlinkTimer) {
            this.contextCursorBlinkTimer.remove();
        }
        this.contextInputCursor.setVisible(true);
        this.updateContextCursorPosition();
        this.contextCursorBlinkTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.contextInputCursor) {
                    this.contextInputCursor.setVisible(!this.contextInputCursor.visible);
                }
            },
            loop: true
        });
    }

    updateContextCursorPosition ()
    {
        if (!this.contextInputText || !this.contextInputCursor) return;
        const textWidth = this.contextInputText.width;
        const inputX = this.scale.width / 2;
        this.contextInputCursor.setX(inputX + textWidth / 2 + 3);
    }

    updateContextInputText ()
    {
        if (this.characterContext === '') {
            this.contextInputText.setText(CHARACTER_CONTEXT_PLACEHOLDER);
            this.contextInputText.setColor('#888888');
        } else {
            this.contextInputText.setText(this.characterContext);
            this.contextInputText.setColor(this.isContextFocused ? '#FFD700' : '#FFFFFF');
        }
        this.updateContextCursorPosition();
    }

    createAndFocusMobileContextInput ()
    {
        const existing = document.getElementById('mobile-context-input');
        if (existing) existing.remove();

        const input = document.createElement('input');
        input.id = 'mobile-context-input';
        input.type = 'text';
        input.value = this.characterContext;
        input.maxLength = CHARACTER_CONTEXT_MAX_LENGTH;
        input.placeholder = CHARACTER_CONTEXT_PLACEHOLDER;
        input.style.position = 'fixed';
        input.style.top = '-100px';
        input.style.left = '-100px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        document.body.appendChild(input);

        input.addEventListener('input', (e) => {
            this.characterContext = e.target.value.substring(0, CHARACTER_CONTEXT_MAX_LENGTH);
            this.updateContextInputText();
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                const el = document.getElementById('mobile-context-input');
                if (el) el.remove();
            }, 100);
        });

        setTimeout(() => input.focus(), 100);
    }

    // ─── Location Input ───────────────────────────────────────────
    createLocationInput ()
    {
        const inputX = this.scale.width / 2;
        const inputY = 500;
        const inputWidth = 500;
        const inputHeight = 28;

        const savedLocation = gameState.getMapLocation();
        this.mapLocation = savedLocation || '';

        this.locationInputBg = this.add.graphics();
        this.updateLocationInputBackground(false);

        const placeholder = 'e.g. "Times Square, NYC" or "Tokyo Tower"';
        this.locationInputText = this.add.text(inputX, inputY,
            this.mapLocation || placeholder, {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: this.mapLocation ? '#FFFFFF' : '#888888',
            letterSpacing: 1,
            align: 'center',
            wordWrap: { width: inputWidth - 20 }
        }).setOrigin(0.5);

        this.locationInputCursor = this.add.text(inputX, inputY, '|', {
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#FFD700'
        }).setOrigin(0.5, 0.5);
        this.locationInputCursor.setVisible(false);

        const zone = this.add.rectangle(inputX, inputY, inputWidth, inputHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerdown', () => {
            this.blurInput();
            this.blurContextInput();
            this.focusLocationInput();
            const isMobile = this.sys.game.device.input.touch || window.innerWidth <= 1024;
            if (isMobile) {
                this.createAndFocusMobileLocationInput();
            }
        });
    }

    updateLocationInputBackground (isFocused)
    {
        this.locationInputBg.clear();

        const inputX = this.scale.width / 2;
        const inputY = 500;
        const inputWidth = 500;
        const inputHeight = 28;
        const borderRadius = 10;

        if (isFocused) {
            this.locationInputBg.fillStyle(0xFFD700, 0.3);
            this.locationInputBg.fillRoundedRect(
                inputX - inputWidth / 2 - 4, inputY - inputHeight / 2 - 4,
                inputWidth + 8, inputHeight + 8, borderRadius + 2
            );
        }

        this.locationInputBg.fillStyle(0x4A90E2, isFocused ? 1 : 0.8);
        this.locationInputBg.fillRoundedRect(
            inputX - inputWidth / 2, inputY - inputHeight / 2,
            inputWidth, inputHeight, borderRadius
        );

        this.locationInputBg.lineStyle(2, isFocused ? 0xFFFFFF : 0x6EA8FE, 1);
        this.locationInputBg.strokeRoundedRect(
            inputX - inputWidth / 2, inputY - inputHeight / 2,
            inputWidth, inputHeight, borderRadius
        );

        this.locationInputBg.fillStyle(0x1A3A5C, isFocused ? 0.2 : 0.3);
        this.locationInputBg.fillRoundedRect(
            inputX - inputWidth / 2 + 2, inputY - inputHeight / 2 + 2,
            inputWidth - 4, inputHeight - 4, borderRadius - 2
        );
    }

    focusLocationInput ()
    {
        this.isLocationFocused = true;
        this.updateLocationInputBackground(true);
        this.locationInputText.setColor('#FFD700');
        if (this.mapLocation === '') {
            this.locationInputText.setText('');
        }
        this.startLocationCursorBlink();
    }

    blurLocationInput ()
    {
        this.isLocationFocused = false;
        this.updateLocationInputBackground(false);
        this.locationInputText.setColor(this.mapLocation ? '#FFFFFF' : '#888888');
        if (this.mapLocation === '') {
            this.locationInputText.setText('e.g. "Times Square, NYC" or "Tokyo Tower"');
        }
        if (this.locationInputCursor) {
            this.locationInputCursor.setVisible(false);
        }
        if (this.locationCursorBlinkTimer) {
            this.locationCursorBlinkTimer.remove();
            this.locationCursorBlinkTimer = null;
        }
    }

    startLocationCursorBlink ()
    {
        if (!this.isLocationFocused) return;
        if (this.locationCursorBlinkTimer) {
            this.locationCursorBlinkTimer.remove();
        }
        this.locationInputCursor.setVisible(true);
        this.updateLocationCursorPosition();
        this.locationCursorBlinkTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.locationInputCursor) {
                    this.locationInputCursor.setVisible(!this.locationInputCursor.visible);
                }
            },
            loop: true
        });
    }

    updateLocationCursorPosition ()
    {
        if (!this.locationInputText || !this.locationInputCursor) return;
        const textWidth = this.locationInputText.width;
        const inputX = this.scale.width / 2;
        this.locationInputCursor.setX(inputX + textWidth / 2 + 3);
    }

    updateLocationInputText ()
    {
        const placeholder = 'e.g. "Times Square, NYC" or "Tokyo Tower"';
        if (this.mapLocation === '') {
            this.locationInputText.setText(placeholder);
            this.locationInputText.setColor('#888888');
        } else {
            this.locationInputText.setText(this.mapLocation);
            this.locationInputText.setColor(this.isLocationFocused ? '#FFD700' : '#FFFFFF');
        }
        this.updateLocationCursorPosition();
    }

    createAndFocusMobileLocationInput ()
    {
        const existing = document.getElementById('mobile-location-input');
        if (existing) existing.remove();

        const input = document.createElement('input');
        input.id = 'mobile-location-input';
        input.type = 'text';
        input.value = this.mapLocation;
        input.maxLength = 200;
        input.placeholder = 'e.g. "Times Square, NYC"';
        input.style.position = 'fixed';
        input.style.top = '-100px';
        input.style.left = '-100px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        document.body.appendChild(input);

        input.addEventListener('input', (e) => {
            this.mapLocation = e.target.value.substring(0, 200);
            this.updateLocationInputText();
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                const el = document.getElementById('mobile-location-input');
                if (el) el.remove();
            }, 100);
        });

        setTimeout(() => input.focus(), 100);
    }

    changeScene ()
    {
        // Get player name (already stored in this.playerName)
        this.playerName = this.playerName.trim() || 'Player';

        // Save player name and character settings to game state
        gameState.setPlayerName(this.playerName);
        gameState.setCharacterType(this.selectedCharacterType);
        gameState.setCharacterContext(this.characterContext.trim());
        gameState.setMapLocation(this.mapLocation.trim());
        gameState.clearNPCPositions();

        // Generate new session ID for this game run
        const sessionId = gameState.generateNewSessionId();

        // Emit player name and session ID to Vue app
        EventBus.emit('player-name-set', this.playerName);
        EventBus.emit('session-started', sessionId);

        const location = this.mapLocation.trim();
        if (location) {
            // Generate map from location data, then start Overworld
            this.generateAndStartOverworld(location);
        } else {
            // No location — use default maps
            this.scene.stop('MainMenu');
            this.scene.start('Overworld', {
                playerName: this.playerName,
                characterType: this.selectedCharacterType,
                characterContext: this.characterContext.trim(),
                mapLocation: ''
            });
        }
    }

    async generateAndStartOverworld (location)
    {
        // Show loading text
        const loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 80, 'GENERATING MAP...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFE066',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(100);

        const loadingDots = this.time.addEvent({
            delay: 400,
            callback: () => {
                const dots = '.'.repeat((loadingText.text.match(/\./g) || []).length % 3 + 1);
                loadingText.setText('GENERATING MAP' + dots);
            },
            loop: true
        });

        try {
            // Fetch location data (uses Google Maps API or fallback)
            const locationData = await fetchLocationData(location);

            // Generate tilemap from location data
            const { tilemap, metadata } = generateTilemap(locationData);

            // Inject generated tilemap into Phaser's cache
            // Phaser expects: { format, data } where data is the Tiled JSON
            if (this.cache.tilemap.exists('generated-map')) {
                this.cache.tilemap.remove('generated-map');
            }
            this.cache.tilemap.add('generated-map', {
                format: 1, // Phaser.Tilemaps.Formats.TILED_JSON
                data: tilemap
            });

            console.log('[MapGen] Generated map cached. Buildings:', metadata.buildings.length,
                'Streets:', metadata.streetLabels.length);

            // Clean up loading UI
            loadingDots.remove();
            loadingText.destroy();

            // Start Overworld with generated map
            this.scene.stop('MainMenu');
            this.scene.start('Overworld', {
                playerName: this.playerName,
                characterType: this.selectedCharacterType,
                characterContext: this.characterContext.trim(),
                mapLocation: location,
                useGeneratedMap: true,
                generatedMapMetadata: metadata
            });

        } catch (error) {
            console.error('[MapGen] Map generation failed:', error);
            loadingDots.remove();
            loadingText.setText('MAP GENERATION FAILED - USING DEFAULT');
            loadingText.setColor('#FF6666');

            // Fall back to default maps after a brief delay
            this.time.delayedCall(1500, () => {
                loadingText.destroy();
                this.scene.stop('MainMenu');
                this.scene.start('Overworld', {
                    playerName: this.playerName,
                    characterType: this.selectedCharacterType,
                    characterContext: this.characterContext.trim(),
                    mapLocation: ''
                });
            });
        }
    }
}
