import {
  _decorator,
  AudioSource,
  Component,
  Input,
  director,
  input,
  sys,
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * 菜单场景展示即播放 BGM。
 *
 * 用法：
 * - 新建节点 `BGM`
 * - 添加 `AudioSource`，把你的 mp3（如 assets/bgm/menu/bilibli_free.mp3）拖到 Clip
 * - 再添加本脚本 `MenuBgm`
 */
@ccclass('MenuBgm')
export class MenuBgm extends Component {
  @property({ type: AudioSource, tooltip: '不填则自动取同节点 AudioSource' })
  public audioSource: AudioSource | null = null;

  @property({ tooltip: '循环播放' })
  public loop = true;

  @property({ tooltip: '是否跨场景常驻（避免切场景音乐断掉）' })
  public persistAcrossScenes = false;

  private static _instance: MenuBgm | null = null;

  protected onLoad(): void {
    if (!this.audioSource) {
      this.audioSource = this.getComponent(AudioSource);
    }

    // 可选：做成单例，避免重复播放
    if (MenuBgm._instance && MenuBgm._instance !== this) {
      this.node.destroy();
      return;
    }
    MenuBgm._instance = this;

    if (this.persistAcrossScenes) {
      director.addPersistRootNode(this.node);
    }

    if (this.audioSource) {
      this.audioSource.loop = this.loop;
    }
  }

  protected start(): void {
    this.tryPlay();

    // Web(尤其手机浏览器)经常需要一次用户触摸才能真正出声，做个兜底
    if (sys.isBrowser) {
      input.once(Input.EventType.TOUCH_START, this.tryPlay, this);
    }
  }

  private tryPlay(): void {
    if (!this.audioSource) return;
    this.audioSource.loop = this.loop;
    if (!this.audioSource.playing) {
      this.audioSource.play();
    }
  }
}

