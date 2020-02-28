import 'phaser'
import {Tweens, Structs, Physics} from 'phaser'

const HEIGHT: number = 896
const GAP: number = 250
const SPEED: number = 200
const GRAVITY: number = 2700
const FLY_HEIGHT: number = 700
const ALIVE_SCORE: number = 1
const PASS_SCORE: number = 10

enum Status {
  ready,
  playing,
  end
}

export default class FlappyBird extends Phaser.Scene {
  status: Status
  size: Structs.Size
  bird: Phaser.Physics.Arcade.Sprite
  birdFly: Tweens.Tween
  birdFloat: Tweens.Tween
  pipes: Phaser.Physics.Arcade.Group
  makePipeTimer: Phaser.Time.TimerEvent
  passTimer: Phaser.Time.TimerEvent
  firstAlivePipe: Physics.Arcade.Image
  birdAliveTimer: Phaser.Time.TimerEvent
  score: number
  scoreText: Phaser.GameObjects.Text
  changeScoreText: Phaser.GameObjects.Text

  constructor () {
    super('Bird')
  }

  preload () {
    this.load.image('background', 'assets/background.png')
    this.load.image('platform', 'assets/platform.png')
    this.load.spritesheet('bird', 'assets/bird.png', {
      frameWidth: 92,
      frameHeight: 64,
      startFrame: 0,
      endFrame: 2
    })
    this.load.image('pipe', 'assets/pipe.png')
  }

  create () {
    this.size = this.scale.baseSize
    // set background and platform
    for (let i = 0; i < Math.ceil(this.size.width / 768); i++) {
      this.add.image(i * 768 + 384 - i, 320, 'background')  // clear the gap of background
    }
    let platforms = this.physics.add.staticGroup()
    for (let i = 0; i < Math.ceil(this.size.width / 36); i++) {
      platforms.create(16 + 36 * i, 832, 'platform')
    }
    platforms.setDepth(9)
    // set bird
    this.bird = this.physics.add.sprite(0, 0, 'bird')
    this.bird.setCollideWorldBounds(true)
    this.physics.add.collider(this.bird, platforms, () => {
      if (this.status === Status.end) return
      this.die()
    })
    // bird waves wings
    this.anims.create({
      key: 'birdfly',
      frames: this.anims.generateFrameNumbers('bird', {
        start: 0,
        end: 2
      }),
      frameRate: 10,
      repeat: -1
    })
    // bird fly upward
    this.birdFly = this.tweens.add({
      targets: this.bird,
      delay: 300,
      duration: 500,
      ease: 'easeOut',
      paused: true,
      props: {
        'angle': {
          value: {
            getStart () {
              return -25
            },
            getEnd () {
              return 90
            }
          }
        }
      }
    })
    // bird float
    this.birdFloat = this.tweens.add({
      targets: this.bird,
      delay: 0,
      duration: 800,
      ease: 'ease',
      y: {
        value: '-=100'
      },
      yoyo: true,
      repeat: -1
    })
    // set pipes
    this.pipes = this.physics.add.group()
    // set score
    this.scoreText = this.add.text(this.size.width / 2, 100, '0', {
      fontSize: '70px',
      fontFamily: 'fb',
      align: 'center'
    })
    this.scoreText.setOrigin(.5, .5)
    this.scoreText.setDepth(9)
    this.changeScoreText = this.add.text(this.size.width / 2, 180, '', {
      fontSize: '70px',
      fontFamily: 'fb',
      align: 'center'
    })
    this.changeScoreText.setOrigin(.5, .5)
    this.changeScoreText.setDepth(9)
    // set event
    this.input.on('pointerdown', function () {
      switch (this.status) {
        case Status.ready: {
          return this.start()
        }
        case Status.playing: {
          return this.fly()
        }
      }
    }, this)
    this.ready()
  }

  ready () {
    // init bird
    ;(this.bird.body as Physics.Arcade.Body).setAllowGravity(false)
    this.bird.setAngle(0)
    this.bird.setVelocityX(0)
    this.bird.setPosition(this.size.width / 3, 300)
    this.birdFloat.restart()
    // init pipes
    this.pipes.clear(true, true)
    this.firstAlivePipe = null
    // init score
    this.setScore(0)
    this.status = Status.ready
  }

  start () {
    this.status = Status.playing
    this.birdFloat.stop()
    ;(this.bird.body as Physics.Arcade.Body).setAllowGravity()
    this.fly()
    this.makePipes()
    this.birdAliveTimer = this.time.addEvent({
      delay: 1000,
      callback: this.aliveScore,
      loop: true,
      callbackScope: this
    })
    // use update lifecycle is too often
    this.passTimer = this.time.addEvent({
      delay: 200,
      callback: this.checkPass,
      loop: true,
      callbackScope: this
    })
  }

  fly () {
    this.bird.setAngle(-25)
    this.birdFly.resume()
    this.birdFly.restart()
    this.bird.setVelocityY(-FLY_HEIGHT)
  }

  makePipes () {
    this.makePipe()
    this.makePipeTimer = this.time.addEvent({
      delay: 2000,
      callback: this.makePipe,
      loop: true,
      callbackScope: this
    })
  }

  makePipe() {
    let up = this.physics.add.image(this.size.width + 100, 0, 'pipe')
    up.setName('up')
    up.setFlipY(true)
    let height = up.height
    let randomHeight = Math.ceil(Math.random() * (this.size.height - 300 - GAP)) - 700 + height / 2
    up.y = randomHeight
    let down = this.physics.add.image(this.size.width + 100, 0, 'pipe')
    down.setName('down')
    down.y = up.y + GAP + height
    this.pipes.addMultiple([up, down])
    // the type of physics.body has bug
    ;(up.body as Physics.Arcade.Body).setAllowGravity(false)
    ;(down.body as Physics.Arcade.Body).setAllowGravity(false)
    up.setImmovable()
    down.setImmovable()
    up.setVelocityX(-SPEED)
    down.setVelocityX(-SPEED)
    let clearPipeTimer: Phaser.Time.TimerEvent = this.time.addEvent({
      delay: this.size.width / SPEED + 3000,
      callback: () => {
        if (up.x < -100) {
          this.pipes.remove(up, true, true)
          this.pipes.remove(down, true, true)
        }
      },
      loop: true,
      callbackScope: this
    })
    this.physics.add.collider(this.bird, [down, up], () => {
      if (this.status === Status.end) return
      clearPipeTimer.destroy()
      this.die()
    })
  }

  stopPipes() {
    this.makePipeTimer.destroy()
  }

  aliveScore() {
    this.addScore(ALIVE_SCORE, false)
  }

  checkPass() {
    if (this.pipes.getLength() <= 0) return
    if (!this.firstAlivePipe) {
      this.firstAlivePipe = this.pipes.getFirstAlive()
      // only judge one pipe in vertical direction
      if (this.firstAlivePipe.name == 'down') {
        this.firstAlivePipe.setActive(false)
        this.firstAlivePipe = null
        return
      }
    }
    let x = this.firstAlivePipe.x
    if (x > this.size.width / 3) return
    this.addScore(PASS_SCORE, true)
    this.firstAlivePipe.setActive(false)
    this.firstAlivePipe = null
  }

  setScore (score: number) {
    this.score = score
    this.scoreText.setText(String(this.score))
  }

  addScore (changeScore: number, showChange?: boolean) {
    this.setScore(this.score + changeScore)
    if (showChange) {
      this.changeScoreText.setText(`+${changeScore}`)
      this.time.addEvent({
        delay: 1000,
        callback: () => {
          this.changeScoreText.setText('')
        },
        loop: false,
        callbackScope: this
      })
    }
  }

  die () {
    this.status = Status.end
    // stop bird
    this.birdFly.stop(1)
    this.bird.setAngle(90)
    this.bird.anims.stop()
    // stop pipes
    this.stopPipes()
    this.pipes.setVelocityX(0)
    // stop timer
    this.passTimer.destroy()
    this.birdAliveTimer.destroy()
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#ded895',
  scene: FlappyBird,
  scale: {
    width: '100%',
    height: HEIGHT,
    mode: Phaser.Scale.ScaleModes.HEIGHT_CONTROLS_WIDTH,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY }
    }
  }
}

const game = new Phaser.Game(config)
