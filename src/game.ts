import 'phaser'
import { Tweens } from 'phaser'

const width = 768
const height = 896

export default class FlappyBird extends Phaser.Scene {

  bird: Phaser.Physics.Arcade.Sprite
  birdTween: Tweens.Tween

  constructor () {
    super('Bird')
  }

  preload () {
    this.load.image('background', 'assets/background.png')
    this.load.image('ground', 'assets/ground.png')
    this.load.spritesheet('bird', 'assets/bird.png', {
      frameWidth: 92,
      frameHeight: 64,
      startFrame: 0,
      endFrame: 2
    })
  }

  create () {
    // set background and ground
    this.add.image(width / 2, 320, 'background')
    let platforms = this.physics.add.staticGroup()
    for (let i = 0; i < Math.ceil(width / 36); i++) {
      platforms.create(16 + 36 * i, 832, 'ground')
    }
    // set bird
    this.bird = this.physics.add.sprite(384, 448, 'bird')
    this.physics.add.collider(this.bird, platforms)
    // wave wings
    this.anims.create({
      key: 'birdfly',
      frames: this.anims.generateFrameNumbers('bird', {
        start: 0,
        end: 2
      }),
      frameRate: 10,
      repeat: -1
    })
    this.bird.play('birdfly')
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
    this.input.on('pointerdown', this.fly, this)
  }

  fly () {
    this.bird.setAngle(-25)
    this.birdTween.resume()
    this.birdTween.restart()
    this.bird.setVelocityY(-700)
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#999',
  width,
  height,
  scene: FlappyBird,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 2700 },
      debug: false
    }
  }
}

const game = new Phaser.Game(config)
