import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import gameState from '../GameState';
import { TITLE_SCREEN_SUBTITLE, TITLE_SCREEN_TAGLINE, CHARACTER_TYPES, CHARACTER_CONTEXT_PLACEHOLDER, CHARACTER_CONTEXT_MAX_LENGTH } from '../../constants.js';
import { fetchLocationData, loadGoogleMapsAPI } from '../../services/google-maps.js';
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

        // Location input state (HTML overlay)
        this.mapLocation = '';
        this.locationHTMLInput = null;
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

        // Location input (optional — for Google Maps integration)
        this.add.text(this.scale.width / 2, 310, 'MAP LOCATION (OPTIONAL):', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#FFD700',
            letterSpacing: 1,
            stroke: '#2D5016',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.createLocationInput();

        // Start button - vibrant Pokemon-style
        const buttonY = 400;
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
            this.blurLocationInput();
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
            const inName = pointer.x >= nameBounds.x && pointer.x <= nameBounds.x + nameBounds.width &&
                           pointer.y >= nameBounds.y && pointer.y <= nameBounds.y + nameBounds.height;

            if (!inName && this.isInputFocused) {
                this.blurInput();
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
        // Skip if any HTML input has focus (location autocomplete, shadow DOM inputs, etc.)
        const active = document.activeElement;
        if (active && active !== document.body && active.tagName !== 'CANVAS') {
            return;
        }

        // Handle Tab to cycle between inputs
        if (event.keyCode === 9) { // Tab
            event.preventDefault();
            if (this.isInputFocused) {
                this.blurInput();
                if (this.locationHTMLInput) this.locationHTMLInput.focus();
            } else {
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

        // Location input is handled by HTML overlay — no Phaser keyboard handling needed
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

    // ─── Location Input (HTML overlay with Google Places Autocomplete) ───
    createLocationInput ()
    {
        // Don't pre-fill from saved location — start fresh each time
        this.mapLocation = '';

        // Draw a placeholder box in Phaser so the layout looks right
        const inputX = this.scale.width / 2;
        const inputY = 340;
        this.locationInputBg = this.add.graphics();
        this.locationInputBg.fillStyle(0x4A90E2, 0.5);
        this.locationInputBg.fillRoundedRect(inputX - 250, inputY - 18, 500, 36, 12);
        this.locationInputBg.lineStyle(2, 0x6EA8FE, 1);
        this.locationInputBg.strokeRoundedRect(inputX - 250, inputY - 18, 500, 36, 12);

        // Create an actual HTML input overlaid on the canvas
        this.createHTMLLocationInput();

        // Reposition on resize
        this.scale.on('resize', () => this.repositionLocationInput());
    }

    createHTMLLocationInput ()
    {
        // Remove if exists
        const existing = document.getElementById('map-location-input');
        if (existing) existing.remove();

        const input = document.createElement('input');
        input.id = 'map-location-input';
        input.type = 'text';
        input.value = this.mapLocation;
        input.maxLength = 200;
        input.placeholder = 'Search a location (e.g. "Times Square, NYC")';
        input.autocomplete = 'off';

        Object.assign(input.style, {
            position: 'absolute',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#fff',
            background: 'rgba(74, 144, 226, 0.85)',
            border: '2px solid #6EA8FE',
            borderRadius: '12px',
            padding: '8px 14px',
            textAlign: 'center',
            outline: 'none',
            zIndex: '500',
            letterSpacing: '1px',
            boxSizing: 'border-box',
        });

        input.addEventListener('input', (e) => {
            this.mapLocation = e.target.value;
        });

        input.addEventListener('focus', () => {
            input.style.borderColor = '#FFD700';
            input.style.background = 'rgba(74, 144, 226, 1)';
            input.style.color = '#FFD700';
            // Disable Phaser keyboard capture while HTML input is focused
            if (this.input?.keyboard) this.input.keyboard.enabled = false;
        });

        input.addEventListener('blur', () => {
            // Re-enable Phaser keyboard
            if (this.input?.keyboard) this.input.keyboard.enabled = true;
            input.style.borderColor = '#6EA8FE';
            input.style.background = 'rgba(74, 144, 226, 0.85)';
            input.style.color = '#fff';
        });

        // Prevent Phaser from eating keystrokes while input is focused
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                input.blur();
                this.changeScene();
            }
        });

        // Add to the game's parent container
        const canvas = this.sys.game.canvas;
        const parent = canvas.parentElement;
        parent.style.position = 'relative';
        parent.appendChild(input);

        this.locationHTMLInput = input;
        this.repositionLocationInput();

        // Initialize Google Places Autocomplete if API key is available
        this.initPlacesAutocomplete(input);
    }

    repositionLocationInput ()
    {
        const input = this.locationHTMLInput;
        if (!input) return;

        const canvas = this.sys.game.canvas;
        const scaleX = canvas.clientWidth / this.scale.width;
        const scaleY = canvas.clientHeight / this.scale.height;

        const gameX = this.scale.width / 2 - 250;
        const gameY = 340 - 18;

        input.style.left = (gameX * scaleX) + 'px';
        input.style.top = (gameY * scaleY) + 'px';
        input.style.width = (500 * scaleX) + 'px';
        input.style.height = (36 * scaleY) + 'px';
        input.style.fontSize = Math.max(8, Math.round(10 * scaleY)) + 'px';
    }

    async initPlacesAutocomplete (textInput)
    {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.log('[MapGen] No Google Maps API key — autocomplete disabled');
            return;
        }

        try {
            // Load Google Maps JS API via shared loader (avoids duplicate script tags)
            await loadGoogleMapsAPI();
            // Wait for PlaceAutocompleteElement to be available
            if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
                await new Promise((resolve) => {
                    const check = setInterval(() => {
                        if (window.google?.maps?.places?.PlaceAutocompleteElement) { clearInterval(check); resolve(); }
                    }, 100);
                    setTimeout(() => { clearInterval(check); resolve(); }, 5000);
                });
            }
            if (!window.google?.maps?.places?.PlaceAutocompleteElement) {
                throw new Error('PlaceAutocompleteElement not available');
            }

            // Hide the plain text input
            textInput.style.display = 'none';

            // Create the new PlaceAutocompleteElement
            const placeAutocomplete = new window.google.maps.places.PlaceAutocompleteElement({
                componentRestrictions: {},
            });

            // Style the autocomplete element container
            const wrapper = document.createElement('div');
            wrapper.id = 'map-location-autocomplete-wrapper';
            Object.assign(wrapper.style, {
                position: textInput.style.position,
                left: textInput.style.left,
                top: textInput.style.top,
                width: textInput.style.width,
                height: textInput.style.height,
                zIndex: '500',
            });

            // Style the inner input via CSS
            const style = document.createElement('style');
            style.textContent = `
                #map-location-autocomplete-wrapper gmp-place-autocomplete {
                    width: 100%;
                    height: 100%;
                    --gmpac-color-surface: rgba(74, 144, 226, 0.9);
                    --gmpac-color-on-surface: #fff;
                    --gmpac-color-on-surface-variant: #ccc;
                    --gmpac-color-outline: #6EA8FE;
                    --gmpac-color-primary: #FFD700;
                    font-family: 'Press Start 2P', monospace;
                    font-size: 10px;
                    border-radius: 12px;
                }
                #map-location-autocomplete-wrapper gmp-place-autocomplete input {
                    font-family: 'Press Start 2P', monospace !important;
                    font-size: 10px !important;
                    letter-spacing: 1px !important;
                    text-align: center !important;
                }
                /* Prevent Phaser from eating keystrokes */
                .pac-container, gmp-place-autocomplete-overlay {
                    z-index: 10000 !important;
                }
            `;
            document.head.appendChild(style);

            wrapper.appendChild(placeAutocomplete);
            textInput.parentElement.appendChild(wrapper);

            // Listen for place selection
            placeAutocomplete.addEventListener('gmp-placeselect', async (event) => {
                const place = event.place;
                await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
                const name = place.formattedAddress || place.displayName || '';
                this.mapLocation = name;
                console.log('[MapGen] Place selected:', name);
            });

            // Disable Phaser keyboard when autocomplete is focused
            // Use focusin/focusout which bubble from shadow DOM
            wrapper.addEventListener('focusin', () => {
                if (this.input?.keyboard) this.input.keyboard.enabled = false;
            });
            wrapper.addEventListener('focusout', () => {
                if (this.input?.keyboard) this.input.keyboard.enabled = true;
            });

            this.locationAutocompleteWrapper = wrapper;
            console.log('[MapGen] Google Places Autocomplete (New) initialized');
        } catch (err) {
            console.warn('[MapGen] Failed to init Places Autocomplete:', err.message);
            // Fall back to plain text input
            textInput.style.display = '';
        }
    }

    blurLocationInput ()
    {
        this.isLocationFocused = false;
    }

    changeScene ()
    {
        // Get player name (already stored in this.playerName)
        this.playerName = this.playerName.trim() || 'Player';

        // Save player name to game state, clear stale settings
        gameState.setPlayerName(this.playerName);
        gameState.setCharacterType(null);
        gameState.setCharacterContext('');
        gameState.setMapLocation(''); // Clear so next session starts fresh
        // Read latest value from HTML input (plain or autocomplete)
        if (this.locationAutocompleteWrapper) {
            const acInput = this.locationAutocompleteWrapper.querySelector('input');
            if (acInput) this.mapLocation = acInput.value || this.mapLocation;
        } else if (this.locationHTMLInput) {
            this.mapLocation = this.locationHTMLInput.value || '';
        }
        gameState.setMapLocation((this.mapLocation || '').trim());
        // Remove HTML overlays
        const el = document.getElementById('map-location-input');
        if (el) el.remove();
        const acw = document.getElementById('map-location-autocomplete-wrapper');
        if (acw) acw.remove();
        gameState.clearNPCPositions();

        // Generate new session ID for this game run
        const sessionId = gameState.generateNewSessionId();

        // Emit player name and session ID to Vue app
        EventBus.emit('player-name-set', this.playerName);
        EventBus.emit('session-started', sessionId);

        const location = (this.mapLocation || '').trim();
        if (location) {
            this.generateAndStartOverworld(location);
        } else {
            this.scene.stop('MainMenu');
            this.scene.start('Overworld', {
                playerName: this.playerName,
                mapLocation: ''
            });
        }
    }

    async generateAndStartOverworld (location)
    {
        const loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 80, 'GENERATING MAP...', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#FFE066',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(100);

        const loadingDots = this.time.addEvent({
            delay: 400, loop: true,
            callback: () => { loadingText.setText('GENERATING MAP' + '.'.repeat((loadingText.text.match(/\./g) || []).length % 3 + 1)); }
        });

        try {
            console.log('[MapGen] Fetching location data for:', location);
            // Timeout after 5 seconds
            const locationData = await Promise.race([
                fetchLocationData(location),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Location fetch timed out')), 5000))
            ]);
            console.log('[MapGen] Location data received:', locationData.location?.formattedAddress, '- Places:', locationData.places?.length);

            console.log('[MapGen] Generating tilemap...');
            const { tilemap, metadata } = generateTilemap(locationData);
            console.log('[MapGen] Tilemap generated:', tilemap.width, 'x', tilemap.height, '- Buildings:', metadata.buildings?.length, '- Streets:', metadata.streetLabels?.length);

            if (this.cache.tilemap.exists('generated-map')) {
                this.cache.tilemap.remove('generated-map');
            }
            this.cache.tilemap.add('generated-map', { format: 1, data: tilemap });
            console.log('[MapGen] Map cached. Starting Overworld...');

            loadingDots.remove();
            loadingText.destroy();

            this.scene.stop('MainMenu');
            this.scene.start('Overworld', {
                playerName: this.playerName,
                mapLocation: location,
                useGeneratedMap: true,
                generatedMapMetadata: metadata
            });
        } catch (error) {
            console.error('[MapGen] Failed:', error);
            loadingDots.remove();
            loadingText.setText('MAP FAILED - USING DEFAULT');
            loadingText.setColor('#FF6666');

            this.time.delayedCall(1500, () => {
                loadingText.destroy();
                this.scene.stop('MainMenu');
                this.scene.start('Overworld', {
                    playerName: this.playerName,
                    mapLocation: ''
                });
            });
        }
    }
}
