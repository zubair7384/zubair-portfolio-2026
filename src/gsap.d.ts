declare module 'gsap/SplitText' {
  export class SplitText {
    constructor(target: any, vars: any);
    chars: HTMLElement[];
    words: HTMLElement[];
    lines: HTMLElement[];
    revert(): void;
  }
}

declare module 'gsap/ScrollSmoother' {
  export class ScrollSmoother {
    static create(vars: any): ScrollSmoother;
    static refresh(vars?: any): void;
    paused(value: boolean): void;
    scrollTop(value?: number): number | void;
    scrollTo(target: any, smooth?: boolean, position?: string): void;
  }
}

declare module 'gsap/all' {
  export * from 'gsap/SplitText';
  export * from 'gsap/ScrollSmoother';
}

declare module 'gsap/ScrollTrigger';
declare module 'gsap/DrawSVGPlugin';
