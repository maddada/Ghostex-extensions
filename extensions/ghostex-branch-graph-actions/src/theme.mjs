// Palette calibration adapted from Ghostex (MIT), chrome_tints.rs. See THIRD_PARTY_NOTICES.md.
const palettes = {"dark":{"000000":[0,0,0],"ffffff":[14,14,14],"808080":[14,14,14],"88d7ff":[10,15,18],"4f6672":[12,14,16],"884444":[13,0,5],"8a5330":[16,5,2],"8a6a2f":[17,10,2],"657a3f":[12,16,5],"3f7a5f":[3,16,6],"2f7d66":[3,16,12],"287c7f":[3,16,17],"336699":[12,14,17],"4f5f96":[8,9,18],"6c4f8f":[10,6,17],"854f7a":[16,6,17],"8a4f5f":[16,4,9],"4a6a8a":[7,13,20],"1f3a8a":[2,6,26],"4b4fa6":[8,8,28],"2f7f7f":[2,18,19],"2e6a3a":[3,18,5],"6b6b35":[14,15,3],"8a6a2a":[19,12,2],"8a4a5c":[18,4,11]},"light":{"000000":[241,241,242],"ffffff":[241,241,242],"808080":[241,241,242],"88d7ff":[237,244,250],"4f6672":[238,241,243],"884444":[247,236,236],"8a5330":[248,240,233],"8a6a2f":[247,243,232],"657a3f":[241,245,234],"3f7a5f":[236,244,238],"2f7d66":[234,244,240],"287c7f":[234,244,244],"336699":[236,241,247],"4f5f96":[239,240,247],"6c4f8f":[242,237,247],"854f7a":[247,236,243],"8a4f5f":[247,236,239],"4a6a8a":[235,241,248],"1f3a8a":[237,239,248],"4b4fa6":[238,238,248],"2f7f7f":[235,244,245],"2e6a3a":[237,247,240],"6b6b35":[244,244,236],"8a6a2a":[246,242,236],"8a4a5c":[247,237,240]}};
const presets = {
  gray: ['808080',96,96], black:['000000',100,100], white:['ffffff',100,100],
  slate:['4a6a8a',94,95], midnight:['1f3a8a',94,94], blue:['336699',96,95],
  indigo:['4b4fa6',94,95], teal:['2f7f7f',94,95], green:['3f7a5f',96,95],
  forest:['2e6a3a',94,94], olive:['6b6b35',94,95], amber:['8a6a2a',94,95],
  orange:['8a5330',96,95], red:['884444',96,95], rose:['8a4a5c',94,95],
  pink:['854f7a',96,95], purple:['6c4f8f',96,95],
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rgb = hex => [0,2,4].map(index => parseInt(hex.slice(index,index+2),16));
const pack = channels => channels.map(value => clamp(Math.round(value),0,255));
const hexValue = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.slice(1).toLowerCase() : '808080';
function contrast(settings,key) {
  if (Number.isFinite(settings[key])) return clamp(Math.round(settings[key]*2)/2,-12,4);
  return ({'-2':-8,'-1':-4,'1':2,'2':4})[Math.round(settings.themeContrast)] || 0;
}
function direction(color) {
  const average = color.reduce((a,b)=>a+b,0)/3;
  const values = color.map(value => value-average);
  const max = Math.max(...values.map(Math.abs));
  return max < .5 ? [0,0,0] : values.map(value => value/max);
}
export function resolveTheme(settings = {}, systemLight = false) {
  const light = settings.sidebarTheme?.startsWith('light') || (['system','auto'].includes(settings.sidebarTheme) && systemLight);
  const mode = light ? 'light' : 'dark';
  const presetName = settings[light ? 'lightThemePreset' : 'darkThemePreset'] || 'gray';
  const preset = presets[presetName] || presets.gray;
  const points = contrast(settings,'themeWorkAreaContrast');
  const sidebarPoints = contrast(settings,'themeSidebarContrast');
  const custom = presetName === 'custom';
  const tint = custom ? hexValue(settings[light ? 'customSidebarTitlebarLightBackgroundTintColor' : 'customSidebarTitlebarBackgroundTintColor']) : preset[0];
  const customDepth = Number(settings[light ? 'customSidebarTitlebarLightBackgroundLightnessPercent' : 'customSidebarTitlebarBackgroundDarknessPercent']) || 96;
  const depth = clamp(Math.round((custom ? customDepth + (light ? -1 : 0) + points - sidebarPoints : preset[light ? 2 : 1] + points)*2)/2,light ? 60 : 85,100);
  let calibrated = palettes[mode][tint];
  if (!calibrated) {
    const channels = rgb(tint), d = direction(channels);
    const base = light ? [241,241,242] : [4,6,7];
    calibrated = base.map((value,index) => value+d[index]*(light ? 6 : 4));
  }
  const scale = (100-depth)/5;
  let chrome = pack(calibrated.map(value => light ? 255-(255-value)*scale : value*scale));
  // Ghostex's Full color end extends the dark presets beyond the calibrated depth.
  const fade = !light ? clamp((-12-Number(settings.themeWorkAreaContrast || 0))/12,0,1) : 0;
  if (fade) {
    let target = rgb(tint);
    const luminance = channels => channels.map(value => value/255).map(value => value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
    if (luminance(target)>.04) {
      let low=0,high=1;
      for(let i=0;i<40;i++){ const middle=(low+high)/2; if(luminance(target.map(v=>v*middle))<=.04) low=middle; else high=middle; }
      target=target.map(value=>value*low);
    }
    chrome=pack(chrome.map((value,index)=>value+(target[index]-value)*fade));
  }
  const isLight = chrome.reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0)/255>.54;
  const content = pack(chrome.map(value => value+(255-value)*(isLight ? .25 : .01)));
  const panel = pack(chrome.map(value => value+(255-value)*(isLight ? .7 : .05)));
  const glass = !['off',false].includes(settings.windowGlass) && settings.windowGlass !== undefined;
  const tintOpacity = Number(settings[light ? 'windowGlassWorkAreaTintLight' : 'windowGlassWorkAreaTintDark'] ?? (light ? 97 : 94))/100;
  return { light:!!light, content, panel, opacity:glass ? clamp(tintOpacity,.05,1) : 1 };
}
export function applyTheme(settings = {}, transparent = true) {
  const theme = resolveTheme(settings,matchMedia('(prefers-color-scheme: light)').matches);
  const root = document.documentElement;
  root.dataset.theme = theme.light ? 'light' : 'dark';
  root.style.setProperty('--base-rgb',theme.content.join(','));
  root.style.setProperty('--panel',`rgb(${theme.panel.join(',')})`);
  root.style.setProperty('--page-opacity',String(transparent ? theme.opacity : 1));
}
