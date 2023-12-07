var snowStorm = (function(window, document) {

    // --- 공통 속성 ---
  
    this.autoStart = true;          // 눈이 자동으로 시작해야 하는지 여부.
    this.excludeMobile = true;      // 눈은 모바일 기기의 CPU (및 배터리)에 대한 부정적인 영향을 미칠 수 있습니다. 사용 시 주의.
    this.flakesMax = 350;           // 생성될 눈의 총량 제한 (떨어지는 것 + 고정되어 있는 것)
    this.flakesMaxActive = 580;      // 동시에 떨어지는 눈의 양 제한 (더 적게 설정하면 CPU 사용량이 낮아집니다)
    this.animationInterval = 60;    // 이론적인 "프레임당 밀리초" 측정 값입니다. 20 = 빠르고 부드럽지만 CPU 사용량이 높습니다. 50 = 더 보수적이지만 느립니다.
    this.useGPU = true;             // 변환 기반 하드웨어 가속을 활성화하여 CPU 부하를 줄입니다.
    this.className = null;          // 눈 요소를 추가로 사용자 정의하기 위한 CSS 클래스 이름
    this.excludeMobile = true;      // 눈은 모바일 기기의 CPU (및 배터리)에 대한 부정적인 영향을 미칠 수 있습니다. 기본 설정은 친절합니다.
    this.flakeBottom = null;        // Y 축 눈 제한을 나타내는 정수, 0 또는 null은 "전체 화면" 눈 효과를 나타냅니다.
    this.followMouse = false;       // 눈 이동이 사용자의 마우스에 반응할 수 있도록 하는 여부
    this.snowColor = '#FFFFFF';        // 노란 눈을 먹지 마세요 (또는 사용하지 마세요).
    this.snowCharacter = '&bull;';  // &bull; = 총알, &middot;는 일부 시스템에서 정사각형입니다.
    this.snowStick = false;          // 눈이 바닥에 "붙어"야 하는지 여부. 끄면 눈이 결측하지 않습니다.
    this.targetElement = null;      // 눈이 추가될 요소 (null = document.body) - 요소 ID (예: 'myDiv') 또는 DOM 노드 참조가 될 수 있음
    this.useMeltEffect = true;      // 떨어진 눈을 재활용할 때 (또는 드물게 떨어질 때), 브라우저가 지원하는 경우 "녹아서 사라지고" 페이드 아웃
    this.useTwinkleEffect = false;  // 눈이 떨어지는 동안 무작위로 "깜빡임"을 허용
    this.usePositionFixed = false;  // true = 스크롤 시 눈이 수직으로 이동하지 않음. CPU 부하가 증가할 수 있으며 기본 설정은 비활성화되어 있음 - 지원되는 경우에만 사용
    this.usePixelPosition = false;  // 눈의 top/left에 대한 픽셀 값 대신 백분율 값을 사용할지 여부. body가 position:relative이거나 targetElement가 지정된 경우 자동으로 활성화됨.
  
    // --- 덜 사용되는 부분 ---
  
    this.freezeOnBlur = true;       // 창이 포커스 상태에 있을 때만 눈이 떨어집니다. CPU 저장.
    this.flakeLeftOffset = 0;       // 컨테이너 가장자리 (예: 브라우저 창)의 왼쪽 여백/거터 공간 (수평 스크롤 막대를 볼 때 이 값 증가)
    this.flakeRightOffset = 0;      // 컨테이너 가장자리의 오른쪽 여백/거터 공간
    this.flakeWidth = 100;            // 눈 요소에 대한 최대 픽셀 너비
    this.flakeHeight = 100;           // 눈 요소에 대한 최대 픽셀 높이
    this.vMaxX = 1;                 // 눈의 최대 X 속도 범위
    this.vMaxY = 1;                 // 눈의 최대 Y 속도 범위
    this.zIndex = -3;                // 각 눈송이에 적용되는 CSS 스택 순서
  
    // --- "내부에는 사용자가 수리할 수 없는 부분"이라고 말합니다. ---
  
    var storm = this,
    features,
    // 고정 위치, 등등에 대한 UA 탐지 및 역호환 렌더링 모드 확인
    isIE = navigator.userAgent.match(/msie/i),
    isIE6 = navigator.userAgent.match(/msie 6/i),
    isMobile = navigator.userAgent.match(/mobile|opera m(ob|in)/i),
    isBackCompatIE = (isIE && document.compatMode === 'BackCompat'),
    noFixed = (isBackCompatIE || isIE6),
    screenX = null, screenX2 = null, screenY = null, scrollY = null, docHeight = null, vRndX = null, vRndY = null,
    windOffset = 1,
    windMultiplier = 2,
    flakeTypes = 6,
    fixedForEverything = false,
    targetElementIsRelative = false,
    opacitySupported = (function(){
      try {
        document.createElement('div').style.opacity = '0.5';
      } catch(e) {
        return false;
      }
      return true;
    }()),
    didInit = false,
    docFrag = document.createDocumentFragment();
  
    features = (function() {
  
      var getAnimationFrame;
  
      /**
       * 팁: 폴 아이리쉬(hat tip: paul irish)
       * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
       * https://gist.github.com/838785
       */
  
      function timeoutShim(callback) {
        window.setTimeout(callback, 1000/(storm.animationInterval || 20));
      }
  
      var _animationFrame = (window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          timeoutShim);
  
      // window에 적용하여 Chrome에서 "잘못된 호출" 오류를 피합니다.
      getAnimationFrame = _animationFrame ? function() {
        return _animationFrame.apply(window, arguments);
      } : null;
  
      var testDiv;
  
      testDiv = document.createElement('div');
  
      function has(prop) {
  
        // 기능 지원 확인
        var result = testDiv.style[prop];
        return (result !== undefined ? prop : null);
  
      }
  
      // 지역 범위 주의.
      var localFeatures = {
  
        transform: {
          ie:  has('-ms-transform'),
          moz: has('MozTransform'),
          opera: has('OTransform'),
          webkit: has('webkitTransform'),
          w3: has('transform'),
          prop: null // 정규화된 속성 값
        },
  
        getAnimationFrame: getAnimationFrame
  
      };
  
      localFeatures.transform.prop = (
        localFeatures.transform.w3 || 
        localFeatures.transform.moz ||
        localFeatures.transform.webkit ||
        localFeatures.transform.ie ||
        localFeatures.transform.opera
      );
  
      testDiv = null;
  
      return localFeatures;
  
    }());
  
    this.timer = null;
    this.flakes = [];
    this.disabled = false;
    this.active = false;
    this.meltFrameCount = 20;
    this.meltFrames = [];
  
    this.setXY = function(o, x, y) {
  
      if (!o) {
        return false;
      }
  
      if (storm.usePixelPosition || targetElementIsRelative) {
  
        o.style.left = (x - storm.flakeWidth) + 'px';
        o.style.top = (y - storm.flakeHeight) + 'px';
  
      } else if (noFixed) {
  
        o.style.right = (100-(x/screenX*100)) + '%';
        // 수직 스크롤 막대를 생성하지 않도록 합니다.
        o.style.top = (Math.min(y, docHeight-storm.flakeHeight)) + 'px';
  
      } else {
  
        if (!storm.flakeBottom) {
  
          // 고정 하단 좌표를 사용하지 않는 경우...
          o.style.right = (100-(x/screenX*100)) + '%';
          o.style.bottom = (100-(y/screenY*100)) + '%';
  
        } else {
  
          // 절대 상단.
          o.style.right = (100-(x/screenX*100)) + '%';
          o.style.top = (Math.min(y, docHeight-storm.flakeHeight)) + 'px';
  
        }
  
      }
  
    };
  
    this.events = (function() {
  
      var old = (!window.addEventListener && window.attachEvent), slice = Array.prototype.slice,
      evt = {
        add: (old?'attachEvent':'addEventListener'),
        remove: (old?'detachEvent':'removeEventListener')
      };
  
      function getArgs(oArgs) {
        var args = slice.call(oArgs), len = args.length;
        if (old) {
          args[1] = 'on' + args[1]; // 접두사
          if (len > 3) {
            args.pop(); // 캡처하지 않음
          }
        } else if (len === 3) {
          args.push(false);
        }
        return args;
      }
  
      function apply(args, sType) {
        var element = args.shift(),
            method = [evt[sType]];
        if (old) {
          element[method](args[0], args[1]);
        } else {
          element[method].apply(element, args);
        }
      }
  
   // 이벤트 추가 함수
  function addEvent() {
    apply(getArgs(arguments), 'add');
  }
  
  // 이벤트 제거 함수
  function removeEvent() {
    apply(getArgs(arguments), 'remove');
  }
  
  return {
    add: addEvent,
    remove: removeEvent
  };
  
  }());
  
  // n 범위 내에서 임의의 숫자 반환, min이 주어지지 않으면 0으로 설정
  function rnd(n,min) {
    if (isNaN(min)) {
      min = 0;
    }
    return (Math.random()*n)+min;
  }
  
  // n의 값에 50% 확률로 음수를 반환하는 함수
  function plusMinus(n) {
    return (parseInt(rnd(2),10)===1?n*-1:n);
  }
  
  // 바람의 방향과 속도를 무작위로 설정하는 함수
  this.randomizeWind = function() {
    var i;
    vRndX = plusMinus(rnd(storm.vMaxX,0.2));
    vRndY = rnd(storm.vMaxY,0.2);
    if (this.flakes) {
      for (i=0; i<this.flakes.length; i++) {
        if (this.flakes[i].active) {
          this.flakes[i].setVelocities();
        }
      }
    }
  };
  
  // 스크롤 이벤트 핸들러, 눈송이가 화면 하단에 고정되게 함
  this.scrollHandler = function() {
    var i;
    scrollY = (storm.flakeBottom ? 0 : parseInt(window.scrollY || document.documentElement.scrollTop || (noFixed ? document.body.scrollTop : 0), 10));
    if (isNaN(scrollY)) {
      scrollY = 0; // Netscape 6 스크롤 수정
    }
    if (!fixedForEverything && !storm.flakeBottom && storm.flakes) {
      for (i=0; i<storm.flakes.length; i++) {
        if (storm.flakes[i].active === 0) {
          storm.flakes[i].stick();
        }
      }
    }
  };
  
  // 창 크기 조정 이벤트 핸들러
  this.resizeHandler = function() {
    if (window.innerWidth || window.innerHeight) {
      screenX = window.innerWidth - 16 - storm.flakeRightOffset;
      screenY = (storm.flakeBottom || window.innerHeight);
    } else {
      screenX = (document.documentElement.clientWidth || document.body.clientWidth || document.body.scrollWidth) - (!isIE ? 8 : 0) - storm.flakeRightOffset;
      screenY = storm.flakeBottom || document.documentElement.clientHeight || document.body.clientHeight || document.body.scrollHeight;
    }
    docHeight = document.body.offsetHeight;
    screenX2 = parseInt(screenX/2,10);
  };
  
  // 대체 창 크기 조정 이벤트 핸들러
  this.resizeHandlerAlt = function() {
    screenX = storm.targetElement.offsetWidth - storm.flakeRightOffset;
    screenY = storm.flakeBottom || storm.targetElement.offsetHeight;
    screenX2 = parseInt(screenX/2,10);
    docHeight = document.body.offsetHeight;
  };
  
  // 애니메이션 일시정지
  this.freeze = function() {
    if (!storm.disabled) {
      storm.disabled = 1;
    } else {
      return false;
    }
    storm.timer = null;
  };
  
  // 애니메이션 재개
  this.resume = function() {
    if (storm.disabled) {
       storm.disabled = 0;
    } else {
      return false;
    }
    storm.timerInit();
  };
  
  // 눈 내리는 효과 토글 함수
  this.toggleSnow = function() {
    if (!storm.flakes.length) {
      // 처음 실행
      storm.start();
    } else {
      storm.active = !storm.active;
      if (storm.active) {
        storm.show();
        storm.resume();
      } else {
        storm.stop();
        storm.freeze();
      }
    }
  };
  
  // 눈 내리는 효과 중지 함수
  this.stop = function() {
    var i;
    this.freeze();
    for (i=0; i<this.flakes.length; i++) {
      this.flakes[i].o.style.display = 'none';
    }
    storm.events.remove(window,'scroll',storm.scrollHandler);
    storm.events.remove(window,'resize',storm.resizeHandler);
    if (storm.freezeOnBlur) {
      if (isIE) {
        storm.events.remove(document,'focusout',storm.freeze);
        storm.events.remove(document,'focusin',storm.resume);
      } else {
        storm.events.remove(window,'blur',storm.freeze);
        storm.events.remove(window,'focus',storm.resume);
      }
    }
  };
  
  
  // 눈송이를 화면에 표시하는 함수
  this.show = function() {
    var i;
    for (i=0; i<this.flakes.length; i++) {
      this.flakes[i].o.style.display = 'block';
    }
  };
  
  // SnowFlake 클래스 정의, 눈송이 개별 객체를 생성
  this.SnowFlake = function(type,x,y) {
    var s = this;
    this.type = type; // 눈송이 타입
    this.x = x||parseInt(rnd(screenX-20),10); // 눈송이의 x 좌표
    this.y = (!isNaN(y)?y:-rnd(screenY)-12); // 눈송이의 y 좌표
    this.vX = null; // x축 속도
    this.vY = null; // y축 속도
    this.vAmpTypes = [1,1.2,1.4,1.6,1.8]; // vX/vY에 대한 "증폭" (눈송이 크기/타입에 따름)
    this.vAmp = this.vAmpTypes[this.type] || 1; // 속도 증폭
    this.melting = false; // 녹고 있는지 여부
    this.meltFrameCount = storm.meltFrameCount; // 녹는 프레임 수
    this.meltFrames = storm.meltFrames; // 녹는 프레임들
    this.meltFrame = 0; // 현재 녹는 프레임
    this.twinkleFrame = 0; // 깜빡이는 프레임
    this.active = 1; // 활성화 여부
    this.fontSize = (10+(this.type/5)*10); // 폰트 크기
    this.o = document.createElement('div'); // 눈송이를 위한 div 요소 생성
    this.o.innerHTML = storm.snowCharacter; // 눈송이 문자 설정
    if (storm.className) {
      this.o.setAttribute('class', storm.className); // 클래스 이름 설정
    }
    this.o.style.color = storm.snowColor; // 눈송이 색상 설정
    this.o.style.position = (fixedForEverything?'fixed':'absolute'); // 위치 설정
    if (storm.useGPU && features.transform.prop) {
      // GPU 가속 사용 시
      this.o.style[features.transform.prop] = 'translate3d(0px, 0px, 0px)';
    }
    this.o.style.width = storm.flakeWidth+'px'; // 눈송이 너비 설정
    this.o.style.height = storm.flakeHeight+'px'; // 눈송이 높이 설정
    this.o.style.fontFamily = 'arial,verdana'; // 폰트 설정
    this.o.style.cursor = 'default'; // 커서 스타일
    this.o.style.overflow = 'hidden'; // 오버플로우 숨김
    this.o.style.fontWeight = 'normal'; // 폰트 두께
    this.o.style.zIndex = storm.zIndex; // z-index 설정
    docFrag.appendChild(this.o); // 문서에 추가
  
    // 눈송이 위치 갱신
    this.refresh = function() {
      if (isNaN(s.x) || isNaN(s.y)) {
        // 유효성 검사
        return false;
      }
      storm.setXY(s.o, s.x, s.y);
    };
  
    // 눈송이 고정 함수
    this.stick = function() {
      if (noFixed || (storm.targetElement !== document.documentElement && storm.targetElement !== document.body)) {
        s.o.style.top = (screenY+scrollY-storm.flakeHeight)+'px';
      } else if (storm.flakeBottom) {
        s.o.style.top = storm.flakeBottom+'px';
      } else {
        s.o.style.display = 'none';
        s.o.style.bottom = '0%';
        s.o.style.position = 'fixed';
        s.o.style.display = 'block';
      }
    };
  
    // 속도 검사 및 조정
    this.vCheck = function() {
      if (s.vX>=0 && s.vX<0.2) {
        s.vX = 0.2;
      } else if (s.vX<0 && s.vX>-0.2) {
        s.vX = -0.2;
      }
      if (s.vY>=0 && s.vY<0.2) {
        s.vY = 0.2;
      }
    };
  
    // 눈송이 이동 함수
    this.move = function() {
      var vX = s.vX*windOffset, yDiff;
      s.x += vX;
      s.y += (s.vY*s.vAmp);
      if (s.x >= screenX || screenX-s.x < storm.flakeWidth) { // x축 스크롤 검사
        s.x = 0;
      } else if (vX < 0 && s.x-storm.flakeLeftOffset < -storm.flakeWidth) {
        s.x = screenX-storm.flakeWidth-1;
      }
      s.refresh();
      yDiff = screenY+scrollY-s.y+storm.flakeHeight;
      if (yDiff<storm.flakeHeight) {
        s.active = 0;
        if (storm.snowStick) {
          s.stick();
        } else {
          s.recycle();
        }
      } else {
        if (storm.useMeltEffect && s.active && s.type < 3 && !s.melting && Math.random()>0.998) {
          // 공중에서 녹을 확률 설정
          s.melting = true;
          s.melt();
        }
        if (storm.useTwinkleEffect) {
          if (s.twinkleFrame < 0) {
            if (Math.random() > 0.97) {
              s.twinkleFrame = parseInt(Math.random() * 8, 10);
            }
          } else {
            s.twinkleFrame--;
            if (!opacitySupported) {
              s.o.style.visibility = (s.twinkleFrame && s.twinkleFrame % 2 === 0 ? 'hidden' : 'visible');
            } else {
              s.o.style.opacity = (s.twinkleFrame && s.twinkleFrame % 2 === 0 ? 0 : 1);
            }
          }
        }
      }
    };
  
    // 애니메이션 메인 루프
    this.animate = function() {
      s.move();
    };
  
    // 속도 설정
    this.setVelocities = function() {
      s.vX = vRndX+rnd(storm.vMaxX*0.12,0.1);
      s.vY = vRndY+rnd(storm.vMaxY*0.12,0.1);
    };
  
    // 투명도 설정
    this.setOpacity = function(o,opacity) {
      if (!opacitySupported) {
        return false;
      }
      o.style.opacity = opacity;
    };
  
    // 녹는 효과
    this.melt = function() {
      if (!storm.useMeltEffect || !s.melting) {
        s.recycle();
      } else {
        if (s.meltFrame < s.meltFrameCount) {
          s.setOpacity(s.o,s.meltFrames[s.meltFrame]);
          s.o.style.fontSize = s.fontSize-(s.fontSize*(s.meltFrame/s.meltFrameCount))+'px';
          s.o.style.lineHeight = storm.flakeHeight+2+(storm.flakeHeight*0.75*(s.meltFrame/s.meltFrameCount))+'px';
          s.meltFrame++;
        } else {
          s.recycle();
        }
      }
    };
  
      this.recycle = function() {
        s.o.style.display = 'none';
        s.o.style.position = (fixedForEverything?'fixed':'absolute');
        s.o.style.bottom = 'auto';
        s.setVelocities();
        s.vCheck();
        s.meltFrame = 0;
        s.melting = false;
        s.setOpacity(s.o,1);
        s.o.style.padding = '0px';
        s.o.style.margin = '0px';
        s.o.style.fontSize = s.fontSize+'px';
        s.o.style.lineHeight = (storm.flakeHeight+2)+'px';
        s.o.style.textAlign = 'center';
        s.o.style.verticalAlign = 'baseline';
        s.x = parseInt(rnd(screenX-storm.flakeWidth-20),10);
        s.y = parseInt(rnd(screenY)*-1,10)-storm.flakeHeight;
        s.refresh();
        s.o.style.display = 'block';
        s.active = 1;
      };
  
      this.recycle(); // set up x/y coords etc.
      this.refresh();
  
    };
  
    this.snow = function() {
      var active = 0, flake = null, i, j;
      for (i=0, j=storm.flakes.length; i<j; i++) {
        if (storm.flakes[i].active === 1) {
          storm.flakes[i].move();
          active++;
        }
        if (storm.flakes[i].melting) {
          storm.flakes[i].melt();
        }
      }
      if (active<storm.flakesMaxActive) {
        flake = storm.flakes[parseInt(rnd(storm.flakes.length),10)];
        if (flake.active === 0) {
          flake.melting = true;
        }
      }
      if (storm.timer) {
        features.getAnimationFrame(storm.snow);
      }
    };
  
    this.mouseMove = function(e) {
      if (!storm.followMouse) {
        return true;
      }
      var x = parseInt(e.clientX,10);
      if (x<screenX2) {
        windOffset = -windMultiplier+(x/screenX2*windMultiplier);
      } else {
        x -= screenX2;
        windOffset = (x/screenX2)*windMultiplier;
      }
    };
  
    this.createSnow = function(limit,allowInactive) {
      var i;
      for (i=0; i<limit; i++) {
        storm.flakes[storm.flakes.length] = new storm.SnowFlake(parseInt(rnd(flakeTypes),10));
        if (allowInactive || i>storm.flakesMaxActive) {
          storm.flakes[storm.flakes.length-1].active = -1;
        }
      }
      storm.targetElement.appendChild(docFrag);
    };
  
    this.timerInit = function() {
      storm.timer = true;
      storm.snow();
    };
  
    this.init = function() {
      var i;
      for (i=0; i<storm.meltFrameCount; i++) {
        storm.meltFrames.push(1-(i/storm.meltFrameCount));
      }
      storm.randomizeWind();
      storm.createSnow(storm.flakesMax); // create initial batch
      storm.events.add(window,'resize',storm.resizeHandler);
      storm.events.add(window,'scroll',storm.scrollHandler);
      if (storm.freezeOnBlur) {
        if (isIE) {
          storm.events.add(document,'focusout',storm.freeze);
          storm.events.add(document,'focusin',storm.resume);
        } else {
          storm.events.add(window,'blur',storm.freeze);
          storm.events.add(window,'focus',storm.resume);
        }
      }
      storm.resizeHandler();
      storm.scrollHandler();
      if (storm.followMouse) {
        storm.events.add(isIE?document:window,'mousemove',storm.mouseMove);
      }
      storm.animationInterval = Math.max(20,storm.animationInterval);
      storm.timerInit();
    };
  
    this.start = function(bFromOnLoad) {
      if (!didInit) {
        didInit = true;
      } else if (bFromOnLoad) {
        // already loaded and running
        return true;
      }
      if (typeof storm.targetElement === 'string') {
        var targetID = storm.targetElement;
        storm.targetElement = document.getElementById(targetID);
        if (!storm.targetElement) {
          throw new Error('Snowstorm: Unable to get targetElement "'+targetID+'"');
        }
      }
      if (!storm.targetElement) {
        storm.targetElement = (document.body || document.documentElement);
      }
      if (storm.targetElement !== document.documentElement && storm.targetElement !== document.body) {
        // re-map handler to get element instead of screen dimensions
        storm.resizeHandler = storm.resizeHandlerAlt;
        //and force-enable pixel positioning
        storm.usePixelPosition = true;
      }
      storm.resizeHandler(); // get bounding box elements
      storm.usePositionFixed = (storm.usePositionFixed && !noFixed && !storm.flakeBottom); // whether or not position:fixed is to be used
      if (window.getComputedStyle) {
        // attempt to determine if body or user-specified snow parent element is relatlively-positioned.
        try {
          targetElementIsRelative = (window.getComputedStyle(storm.targetElement, null).getPropertyValue('position') === 'relative');
        } catch(e) {
          // oh well
          targetElementIsRelative = false;
        }
      }
      fixedForEverything = storm.usePositionFixed;
      if (screenX && screenY && !storm.disabled) {
        storm.init();
        storm.active = true;
      }
    };
  
    function doDelayedStart() {
      window.setTimeout(function() {
        storm.start(true);
      }, 20);
      // event cleanup
      storm.events.remove(isIE?document:window,'mousemove',doDelayedStart);
    }
  
    function doStart() {
      if (!storm.excludeMobile || !isMobile) {
        doDelayedStart();
      }
      // event cleanup
      storm.events.remove(window, 'load', doStart);
    }
  
    // hooks for starting the snow
    if (storm.autoStart) {
      storm.events.add(window, 'load', doStart, false);
    }
  
    return this;
  
  }(window, document));
  