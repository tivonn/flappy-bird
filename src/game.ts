import 'phaser'
import {Tweens, Structs, Physics} from 'phaser'

const HEIGHT = 896
const gap = 250
const SPEED = 200

enum Status {
  ready,
  playing,
  end
}

export default class FlappyBird extends Phaser.Scene {
  status: Status
  size: Structs.Size
  bird: Phaser.Physics.Arcade.Sprite
  birdTween: Tweens.Tween
  pipes: Phaser.Physics.Arcade.Group
  makePipeTimer: Phaser.Time.TimerEvent

  constructor () {
    super('Bird')
    this.status = Status.ready
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
    this.bird = this.physics.add.sprite(384, 448, 'bird')
    this.bird.setCollideWorldBounds(true)
    this.physics.add.collider(this.bird, platforms, () => {
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
    // fly upward
    this.birdTween = this.tweens.add({
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
    // set pipes
    this.pipes = this.physics.add.group()
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
    this.pipes.clear(true, true)  // init pipes
    this.start()
  }

  start () {
    this.makePipes()
  }

  fly () {
    this.bird.setAngle(-25)
    this.birdTween.resume()
    this.birdTween.restart()
    this.bird.setVelocityY(-700)
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
    let randomHeight = Math.ceil(Math.random() * (this.size.height - 300 - gap)) - 700 + height / 2
    up.y = randomHeight
    let down = this.physics.add.image(this.size.width + 100, 0, 'pipe')
    down.setName('down')
    down.y = up.y + gap + height
    this.pipes.addMultiple([up, down])
    // 目前Phaser有bug，physics.body的类型不正确
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

  die () {
    this.stopPipes()
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
      gravity: { y: 2700 }
    }
  }
}

const game = new Phaser.Game(config)
