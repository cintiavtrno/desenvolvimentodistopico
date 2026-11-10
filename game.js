import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

/* =====================  CONFIGURAÇÃO (ajuste aqui)  =====================
   Unidades em metros. Sala: X = oeste→leste, Z = norte→sul, Y = altura.
   tam = maior dimensão-alvo (m) · alt = altura-alvo (m) · escala = multiplicador · rot = graus · col = colisão   */
const SALA={w:16,d:7};const PART=8;
const CENA=[
 {arquivo:'Scifi_PC',       pos:[2.4,0,0.95], rot:0,   alt:1.5, col:1},
 {arquivo:'Gaming_Computer',pos:[5.4,0,0.95], rot:0,   alt:1.6, col:1},
 {arquivo:'Desk_L',         pos:[0.9,0,3.2],  rot:90,  tam:2.2, col:1},
 {arquivo:'Chair',          pos:[2.5,0,2.3],  rot:200, alt:1.0, col:0},
 {arquivo:'Ultimaker_3',    pos:[7.1,0,5.6],  rot:-90, alt:1.1, col:1},
 {arquivo:'Locker',         pos:[0.6,0,5.9],  rot:90,  alt:1.9, col:1},
 {arquivo:'Shelves',        pos:[15.4,0,2.0], rot:-90, alt:2.0, col:1},
 {arquivo:'Shelves',        pos:[15.4,0,4.6], rot:-90, alt:2.0, col:1},
 {arquivo:'Locker',         pos:[12.0,0,0.5], rot:0,   alt:1.9, col:1},
 {arquivo:'Desk_L',         pos:[9.2,0,6.0],  rot:180, tam:2.2, col:1},
 {arquivo:'Chair',          pos:[9.6,0,4.9],  rot:20,  alt:1.0, col:0},
];
const CAM={zoom:9,dist:34,elev:.82,seguir:6};
const CIDADE={avenidas:Array.from({length:15},(_,i)=>-168+24*i),tile:8,limite:192};
const DRONE={x:0,y:55,z:80,yaw:0,pitch:-.5,alcance:85};
/* ====================================================================== */
(async()=>{
const $=s=>document.querySelector(s);const cv=$('#c');

/* ---------- retratos ---------- */
function portrait(who){const c=document.createElement('canvas');c.width=c.height=40;const x=c.getContext('2d');
 const R=(a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};
 R(0,0,40,40,{dilson:'#2b2316',sis:'#07161c'}[who]);for(let i=0;i<40;i+=2)R(0,i,40,1,'rgba(255,255,255,.04)');
 if(who==='sis'){for(let yy=0;yy<40;yy++)for(let xx=0;xx<40;xx++){const d=Math.hypot(xx-19.5,yy-19.5);let col=null;
  if(d<4)col='#e8fffd';else if(d<8)col='#00D5C8';else if(d<10)col='#063a46';else if(d<13&&((xx+yy)&1))col='#0b4a58';else if(d>=15&&d<16.5)col='#00D5C8';if(col)R(xx,yy,1,1,col);}return c.toDataURL();}
 R(5,31,30,9,'#4a5a44');R(17,27,6,5,'#7a5236');R(13,9,14,2,'#9a6a46');R(12,11,16,15,'#9a6a46');R(13,26,14,2,'#9a6a46');
 R(11,6,18,5,'#d8d2c4');R(10,9,3,6,'#d8d2c4');R(27,9,3,6,'#d8d2c4');
 R(15,15,5,1,'#e8e2d4');R(21,15,5,1,'#e8e2d4');R(16,17,3,2,'#14141f');R(22,17,3,2,'#14141f');
 R(12,22,16,6,'#cfc8b8');R(18,24,4,1,'#6a3a30');R(5,31,30,1,'#F4B942');
 return c.toDataURL();}
const PORT={dilson:portrait('dilson'),sis:portrait('sis')};

/* ---------- estado e interface ---------- */
const st={termo:0,painel:0,feed:0,call:0,p:{},fim:0,q:{},f2:0,pn2:0,feed2:0,fim2:0};
const PISTAS={
 p1:['Quadra Aurora','A maioria das janelas está apagada e o medidor de água da calçada marca zero em quase toda a quadra.'],
 p2:['Casa 17','Uma casa baixa, janela acesa, fora do traçado das ruas novas. O número foi pintado à mão no portão e não existe no cadastro do Consórcio.'],
 p3:['Tapume','Duas quadras de tapume terminam numa placa: PROJETO CONCLUÍDO. Em letra menor: reassentamento, ver Anexo 7.'],
 p4:['Beneficiários','Das 4.800 unidades entregues, 4.188 pertencem a um fundo imobiliário do próprio Consórcio e 612 a famílias reassentadas.'],
 p5:['Laudo de risco','O laudo que justificou as remoções foi assinado pela engenharia do Consórcio. Não há revisão independente anexada.'],
 p6:['Limpeza de base','Em 2009 havia 4.212 famílias no cadastro. Hoje constam 612 reassentadas e nenhum registro de saída: 3.600 famílias sumiram da base sem terem sido removidas no papel.']};
const nP=()=>Object.keys(st.p).length;
const PQ={
 q1:['Centro de distribuição','Galpão aceso 24 horas. Na entrada, a escala do dia lista 38 pessoas. As esteiras e os braços mecânicos funcionam com 2.100 robôs.'],
 q2:['Entregador','Um entregador cruza a cidade numa bicicleta elétrica alugada pelo aplicativo. Sai da periferia de madrugada, passa três horas no trajeto e termina o turno sem entrar em nenhuma das torres acesas. A rota passa a 400 m da Casa 17.'],
 q3:['Portão de serviço','Uma fila de pessoas entra às 3h12 pela porta de serviço da Torre Central para limpar os andares. Nenhuma passa pela catraca principal. O painel conta essas vagas como "terceirizadas externas".'],
 q4:['Painel de vagas','O painel de vagas anuncia 11.400 postos abertos. Em letra miúda: "exige comprovante de endereço no cadastro oficial". Quem foi apagado do cadastro na limpeza de base não consegue se candidatar.']};
const nQ=()=>Object.keys(st.q).length;
const pw=$('#panel'),pn=$('#pin');let uiOpen=false,started=false,modo='sala';
function ui(h){pn.innerHTML=h;pw.style.display='block';uiOpen=true;pn.scrollTop=0;}
function closeUI(){pw.style.display='none';uiOpen=false;pn.innerHTML='';}
let tt;function toast(m,ms=4500){const e=$('#toast');e.textContent=m;e.style.display='block';clearTimeout(tt);tt=setTimeout(()=>e.style.display='none',ms);}
const A={close:closeUI};pn.onclick=e=>{const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a])A[b.dataset.a](b.dataset.v);};
const bt=(a,l,v='',x='')=>`<button class="btn ${x}" data-a="${a}" data-v="${v}">${l}</button>`;
const call=(who,nome,papel,txt)=>`<div class="call"><div class="vid"><img src="${PORT[who]}"><span class="live">● AO VIVO</span></div><div class="tx"><b>${nome}</b><small>${papel}</small><p>${txt}</p></div></div>`;
function pista(id){const q=PQ[id],S=q?st.q:st.p;if(S[id])return false;S[id]=1;upObj();toast('Anotado no caderno de campo: '+(q||PISTAS[id])[0]+'.');if(!st.f2&&!st.av&&st.p.p1&&st.p.p2&&st.p.p3){st.av=1;setTimeout(()=>toast('As 3 observações do drone estão feitas. Aperte Esc, volte ao painel de indicadores e faça as 3 que faltam: no painel, Detalhar Moradia e Abrir laudos; no terminal, atender a chamada do número desconhecido. Cada um vale uma observação.',9000),2600);}return true;}

/* ---------- objetivos ---------- */
const OB=[['termo','Ler o Termo de Conclusão',()=>st.termo,'termo'],['painel','Conferir o painel de indicadores',()=>st.painel,'painel'],
 ['feed','Lançar o drone no terminal',()=>st.feed,'terminal'],['pistas','Reunir observações ('+nP()+'/6)',()=>nP()>=6,'arquivo'],['fim','Decidir no certificado',()=>st.fim,'impressora']];
function nextT(){const o=OB.find(o=>!o[2]());return o?TG.find(t=>t.id===(o[0]==='pistas'&&!st.f2&&st.p.p1&&st.p.p2&&st.p.p3?((st.p.p4&&st.p.p5)?'terminal':'painel'):o[3])):null;}
function upObj(){$('#objin').innerHTML='<h4>'+(st.f2?'Fase 2 · Trabalho e renda':'Fase 1 · Moradia')+'</h4>'+OB.map(o=>{const d=o[2](),n=!d&&o===OB.find(x=>!x[2]());const l=o[0]==='pistas'?(!st.f2&&st.p.p1&&st.p.p2&&st.p.p3&&nP()<6?'Falta: '+[!st.p.p4&&'Detalhar Moradia (painel)',!st.p.p5&&'Abrir laudos (painel)',!st.p.p6&&'atender a chamada (terminal)'].filter(Boolean).join(', ')+' ('+nP()+'/6)':'Reunir observações ('+(st.f2?nQ()+'/4':nP()+'/6')+')'):o[1];return `<div class="${d?'d':n?'n':''}">${d?'■':'□'} ${l}</div>`}).join('');}

/* ---------- textos e menus ---------- */
const TG=[{id:'termo',x:1.9,y:3.2,l:'Ler o Termo de Conclusão'},{id:'painel',x:2.4,y:1.9,l:'Abrir o painel de indicadores'},{id:'terminal',x:5.4,y:1.9,l:'Usar o terminal do drone'},
 {id:'arquivo',x:6.4,y:3.2,l:'Abrir o caderno de campo'},{id:'impressora',x:6.3,y:5.6,l:'Certificado de conclusão'},{id:'armario',x:1.4,y:5.9,l:'Abrir o armário'},{id:'cama',x:3.6,y:5.0,l:'Olhar a cama'},{id:'iara',x:10.4,y:3.4,l:'Falar com a Iara'},{id:'gato',x:13.3,y:2.4,l:'Falar com o Bit'}];
A.termo=()=>{st.termo=1;upObj();ui(`<h2>Termo de Conclusão · Projeto Meridiano</h2><p>Verificação remota autorizada. A visita presencial foi dispensada pelo contratante.</p><p>Prazo: três dias. A assinatura libera a parcela final ao Consórcio Meridiano.</p><p class="sm">Pelo painel, 11 dos 11 indicadores estão conformes. Esta fase examina o indicador de Moradia.</p>`+bt('close','Fechar'));};
A.painel=()=>{st.painel=1;upObj();ui(`<h2>Painel de indicadores · Meridiano</h2><table><tr><th>Indicador</th><th>Meta</th><th>Resultado</th><th></th></tr>
<tr><td>Moradia</td><td>4.800 unidades</td><td>4.800 (100%)</td><td class="ok">conforme</td></tr><tr><td>Mobilidade</td><td>90% da frota elétrica</td><td>98%</td><td class="ok">conforme</td></tr>
<tr><td>Emissões</td><td>−30%</td><td>−41%</td><td class="ok">conforme</td></tr><tr><td>Conectividade</td><td>cobertura total</td><td>100%</td><td class="ok">conforme</td></tr>
<tr><td>Participação</td><td>consulta pública</td><td>1 realizada (2019)</td><td class="ok">conforme</td></tr></table>`+bt('pmor','Detalhar Moradia')+bt('plaudo','Abrir laudos de risco')+bt('close','Sair'));};
A.pmor=()=>{const livre=st.p.p1||st.p.p2||st.p.p3;
 ui(`<h2>Moradia · detalhe</h2><p>Unidades entregues: <b>4.800</b> de 4.800.</p><p>Campo "beneficiário": <span class="sm">recolhido por padrão. Só abre com uma observação de campo anexada.</span></p>`+
 (st.p.p4?`<p>Fundo imobiliário do Consórcio: <b>4.188</b><br>Famílias reassentadas: <b>612</b><br>Famílias no cadastro de 2009: <b>4.212</b><br>Registros de saída: <b>0</b></p>`:(livre?bt('filtro','Exibir o campo "beneficiário"'):'<p class="sm">Nenhuma observação anexada ainda. O drone pode fornecer uma.</p>'))+bt('painel','‹ Voltar'));};
A.filtro=()=>{pista('p4');A.pmor();};
A.plaudo=()=>{if(!st.p.p3){ui(`<h2>Laudos de risco</h2><p>Laudo não localizado. A busca exige o número de um anexo de referência.</p>`+bt('painel','‹ Voltar'));return;}
 pista('p5');ui(`<h2>Laudo de risco nº 0338</h2><p>Área reassentada: <i>"risco de desabamento, remoção recomendada."</i></p><p>Emitente: Engenharia do Consórcio Meridiano.<br>Revisão independente: <span class="bad">não anexada</span>.</p><p class="sm">Quem recomendou a remoção é quem recebeu o terreno.</p>`+bt('painel','‹ Voltar'));};
A.terminal=()=>{ui(`<h2>Terminal do drone</h2><p class="sm">Drone 01 na base. Bateria 100%. Sinal estável.</p>`+bt('lancar','Lançar o drone')+(st.fim&&!st.f2?bt('fase2','Abrir o indicador: Trabalho e renda','','on'):'')+(st.p.p2&&!st.call?bt('atender','Atender chamada de número desconhecido','','on'):'')+bt('close','Sair'));};
A.lancar=()=>{closeUI();st.feed=1;if(st.f2)st.feed2=1;upObj();entrarFeed();};
const DL={'0':{t:'Boa noite. Vi o drone parado na viela dos Fundos. Eu moro na 17. Só quero saber se alguém vai olhar isso de verdade ou se é mais um visto.',c:[['Quem é você?','1'],['Estou olhando. Pode contar.','2']]},
 '1':{t:'Dilson. Fui eletricista da obra e depois fiquei sem lugar. A casa era do meu pai. Quando mediram a rua, a nossa ficou fora do mapa.',c:[['E o resto da vizinhança?','2']]},
 '2':{t:'Eram umas quatro mil famílias. Quando foram embora o sistema não registrou saída. Aqui chamam isso de limpeza de base: o cadastro velho some e o novo começa do zero. Sem registro antigo, ninguém foi removido.',c:[['Dá para provar?','3']]},
 '3':{t:'No papel, quase nada. Mas olha a lista de beneficiários da Moradia e compara com o cadastro de 2009. A diferença é o tamanho do buraco.',c:[['Vou conferir.','_end']]}};
A.atender=()=>nó('0');
function nó(id){const n=DL[id];ui(call('dilson','Dilson','morador da Casa 17',n.t)+n.c.map(c=>bt('nó',c[0],c[1])).join(''));}
A.nó=v=>{if(v==='_end'){st.call=1;pista('p6');closeUI();return;}nó(v);};
A.arquivo=()=>{const SRC=st.f2?PQ:PISTAS,SS=st.f2?st.q:st.p,ids=Object.keys(SRC).filter(k=>SS[k]);ui(`<h2>Caderno de campo</h2>`+(ids.length?ids.map(k=>`<h3>${SRC[k][0]}</h3><p>${SRC[k][1]}</p>`).join(''):'<p class="sm">Ainda sem anotações.</p>')+`<p class="sm">${ids.length} de ${st.f2?4:6} observações.</p>`+bt('close','Fechar'));};
A.armario=()=>ui(`<h2>Armário</h2><p>Casacos, uma caixa de ferramentas, um capacete de vistoria que nunca saiu da prateleira. A visita presencial foi dispensada.</p>`+bt('close','Fechar'));
A.cama=()=>ui(`<h2>Cama</h2><p>Três dias de prazo e um relatório para assinar. A cidade que você audita fica a 800 km daqui, e você só a conhece pelo painel e pela câmera do drone.</p>`+bt('close','Fechar'));
A.impressora=()=>{const n=nP();ui(`<h2>Certificado de Conclusão · Moradia</h2>`+(st.feed?bt('luta','Atender a campainha (confronto com o Consórcio)','','on'):'')+call('sis','MERIDIANA','assistente do projeto','Todos os indicadores constam como conformes. Recomendo assinar. Posso emitir o certificado agora.')+
 `<p class="sm">Observações no caderno: ${n} de 6.</p>`+bt('dec','Assinar como conforme','c')+bt('dec','Marcar Moradia como pendente','p')+bt('dec','Solicitar vistoria presencial','v')+bt('close','Voltar'));};
A.dec=v=>{const n=nP();let t='';
 if(v==='p'&&n<3){ui(`<h2>Justificativa insuficiente</h2><p>Uma pendência precisa de pelo menos três observações anexadas. Há ${n}.</p>`+bt('impressora','‹ Voltar'));return;}
 if(v==='v'&&!st.p.p6){ui(`<h2>Pedido sem fundamento</h2><p>A coordenação exige uma evidência de lacuna cadastral para autorizar uma vistoria presencial.</p>`+bt('impressora','‹ Voltar'));return;}
 t={c:'A impressora emite o certificado. A parcela final é liberada na manhã seguinte e Moradia continua verde no painel. A casa 17 continua fora do mapa.',
  p:'A pendência chega ao Consórcio, que tem 30 dias para responder. O indicador de Participação, que dependia de Moradia, passa a amarelo. Dilson não recebe nenhuma resposta, mas a luz da casa 17 aparece acesa na próxima imagem do drone.',
  v:'O pedido segue para a coordenação. A vistoria exige nova autorização e o prazo do termo continua correndo. Ficou claro para quem precisa assinar que alguém está olhando.'}[v];
 st.fim=1;upObj();ui(`<h2 style="color:#ffb13b">Fase 1 concluída</h2><p>${t}</p>`+(v==='c'?'<p class="sm">Próximo indicador: Trabalho e renda.</p>'+bt('close','Continuar na sala'):'<p>A campainha toca. Pela câmera da porta, duas pessoas do Consórcio e um robô de obra esperam no corredor.</p>'+bt('luta','Atender a porta','','on')+bt('close','Fingir que não está em casa')));};
/* ===== BATALHA POR TURNOS ===== */
const PIS=()=>nP();
let B=null;
const barra=(h,m,c)=>`<span style="display:inline-block;width:110px;height:9px;background:#10182a;border:1px solid ${c};vertical-align:middle"><i style="display:block;height:100%;width:${Math.max(0,h/m*100)}%;background:${c}"></i></span> ${Math.max(0,h)}/${m}`;
function brender(msg){
 const aliv=B.e.filter(e=>e.hp>0);
 const lin=(x,c)=>`<div style="margin:.25em 0"><b style="color:${c}">${x.n}</b> ${barra(x.hp,x.max,c)}${x.esc?' · exposto':''}${x.def?' · em guarda':''}</div>`;
 let h=`<h2 style="color:#ff4fd8">Corredor · Equipe de contenção</h2><div class="grid3" style="grid-template-columns:1fr 1fr;align-items:start"><div>${B.p.map(x=>lin(x,'#00e5d8')).join('')}</div><div>${B.e.map(x=>lin(x,'#ff4fd8')).join('')}</div></div><p class="sm" style="min-height:3.6em;border-top:1px solid #28405a;padding-top:.5em">${msg||''}</p>`;
 if(B.fim)return h+bt('bfim',B.fim==='v'?'Fechar a porta':'Recomeçar o confronto');
 const q=B.p[B.vez];h+=`<h3>Vez: ${q.n}</h3>`;
 if(B.alvo){return h+'<p class="sm">Escolha o alvo.</p><div class="grid3" style="grid-template-columns:1fr 1fr">'+aliv.map(e=>bt('bal',e.n,B.e.indexOf(e))).join('')+'</div>'+bt('bcan','‹ Voltar');}
 if(B.vez===0)h+=`<div class="grid3"><button class="btn" data-a="bsk" data-v="cita">Citar pista<br><small>dano ${10+6*PIS()}</small></button><button class="btn" data-a="bsk" data-v="laudo" ${st.p.p5?'':'disabled style="opacity:.4"'}>Ler o laudo<br><small>28 · exige Laudo</small></button><button class="btn" data-a="bsk" data-v="resp">Respirar<br><small>cura 18</small></button></div>`;
 else h+=`<div class="grid3"><button class="btn" data-a="bsk" data-v="emp">Pulso EMP<br><small>22 · 2x em robô</small></button><button class="btn" data-a="bsk" data-v="cam">Gravar a cena<br><small>expõe o alvo</small></button><button class="btn" data-a="bsk" data-v="grd">Guarda<br><small>reduz dano</small></button></div>`;
 return h;}
function bini(){B={p:[{n:'Você',hp:70,max:70},{n:'Drone 01',hp:45,max:45}],e:[{n:'Segurança do Consórcio',hp:55,max:55,k:'h'},{n:'Robô de obra',hp:80,max:80,k:'r'}],vez:0,sk:null,alvo:0,fim:0};ui(brender('Eles chegam com um papel timbrado e uma explicação pronta.'));}
A.luta=bini;A.bcan=()=>{B.alvo=0;ui(brender());};
function etapa(msg){ /* encerra o turno do jogador atual e roda inimigos ao fim do segundo */
 B.alvo=0;B.p.forEach(x=>{if(x.hp<=0)x.hp=0;});
 if(B.e.every(e=>e.hp<=0)){B.fim='v';ui(brender(msg+' O corredor fica em silêncio. Ninguém tem argumento para o que a câmera gravou.'));return;}
 B.vez++;
 if(B.vez>1){B.vez=0;let m=msg;for(const e of B.e){if(e.hp<=0)continue;const v=B.p.filter(x=>x.hp>0);if(!v.length)break;const t=v[Math.floor(Math.random()*v.length)];
   if(e.esc&&Math.random()<.5){m+=` ${e.n} hesita diante da câmera.`;e.esc=0;continue;}e.esc=0;
   let d=e.k==='r'?14:10;d+=Math.floor(Math.random()*5);if(t.def)d=Math.ceil(d*.5);t.hp-=d;m+=` ${e.n} atinge ${t.n} (-${d}).`;}
  B.p.forEach(x=>x.def=0);
  if(B.p.every(x=>x.hp<=0)){B.fim='d';ui(brender(m+' Vocês caem. A porta fecha por fora.'));return;}
  if(B.p[0].hp<=0){B.vez=1;} msg=m;}
 else if(B.p[1].hp<=0){return etapa(msg);}
 ui(brender(msg));}
A.bsk=v=>{B.sk=v;if(v==='resp'){const q=B.p[0];q.hp=Math.min(q.max,q.hp+18);return etapa('Você respira e confere o caderno (+18).');}
 if(v==='grd'){B.p[1].def=1;return etapa('Drone 01 se coloca entre vocês e a porta.');}
 B.alvo=1;ui(brender());};
A.bal=i=>{const e=B.e[i],v=B.sk;let d=0,m='';
 if(v==='cita'){d=10+6*PIS();m=`Você cita uma observação do caderno diante de ${e.n}. `;}
 if(v==='laudo'){d=28;m=`Você lê o laudo em voz alta. `;}
 if(v==='emp'){d=e.k==='r'?44:22;m=`Drone 01 solta um pulso em ${e.n}. `;}
 if(v==='cam'){e.esc=1;d=8;m=`Drone 01 grava ${e.n} de perto. `;}
 if(e.esc&&v!=='cam'){d=Math.ceil(d*1.3);}
 if(e.k==='h'&&v==='emp')d=Math.ceil(d*.5);
 e.hp-=d;etapa(m+`(-${d})`);};
A.bfim=()=>{if(B.fim==='v'){B.fim=0;closeUI();toast('A equipe recua. Próximo indicador: Trabalho e renda.',6000);}else bini();};


/* ---------- renderizador ---------- */
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const sceneR=new THREE.Scene(),sceneC=new THREE.Scene();
sceneR.background=new THREE.Color(0x05070d);sceneC.background=new THREE.Color(0x050912);sceneC.fog=new THREE.FogExp2(0x0a1226,.0048);
const camR=new THREE.OrthographicCamera(-10,10,10,-10,1,120),camC=new THREE.PerspectiveCamera(58,1,.5,600);
let rp,composer,bloom;
function resize(){const w=innerWidth,h=innerHeight,a=w/h;renderer.setSize(w,h,false);if(composer)composer.setSize(w,h);
 const v=CAM.zoom*(a<1.2?1.4:1);camR.left=-v*a/2;camR.right=v*a/2;camR.top=v/2;camR.bottom=-v/2;camR.updateProjectionMatrix();camC.aspect=a;camC.updateProjectionMatrix();}
addEventListener('resize',resize);
const loader=new GLTFLoader(),cache={};
async function unpack(b64){const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));return await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
async function carregar(n){return cache[n]||(cache[n]=fetch('assets/'+n+'.bin').then(r=>{if(!r.ok)throw new Error('GLB ausente: '+n);return r.arrayBuffer();}).then(b=>new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()).then(b=>loader.parseAsync(b,'')));}
const STEEL=new THREE.Color(0x3b4a5e),_h={};
function harm(m,warm){const n=new THREE.MeshStandardMaterial({map:m.map||null});const c=(m.color||new THREE.Color(1,1,1)).clone();c.getHSL(_h);const s0=_h.s;
 c.lerp(warm?new THREE.Color(0x5a4636):STEEL,s0>.3?.8:.5);c.getHSL(_h);if(_h.l>.42)c.setHSL(_h.h,_h.s,.42);n.color=c;if(m.map)n.color=new THREE.Color(0xc8cde0);
 if(m.emissive&&(m.emissive.r+m.emissive.g+m.emissive.b)>.05){n.emissive=m.emissive.clone();n.emissiveIntensity=1.6;}
 n.metalness=Math.min(Math.max(m.metalness??0,.2),.5);n.roughness=Math.min(Math.max(m.roughness??.6,.4),.75);if(m.transparent){n.transparent=true;n.opacity=m.opacity;}return n;}
function tex(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;}

/* ================= SALA ================= */
const BLK=[],WALLS=[];
sceneR.add(new THREE.HemisphereLight(0x2a3a5c,0x120c08,1.6));
const lampada=new THREE.PointLight(0xffb060,34,10,2);lampada.position.set(3.2,2.6,3.2);lampada.castShadow=false;sceneR.add(lampada);
const telaL=new THREE.PointLight(0x00e5d8,14,6,2);telaL.position.set(4,1.6,1.8);sceneR.add(telaL);
const sol=new THREE.DirectionalLight(0x8aa6d8,.4);sol.castShadow=true;sol.shadow.mapSize.set(2048,2048);sol.shadow.normalBias=.04;Object.assign(sol.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:60});sol.shadow.bias=-.0006;sol.position.set(13,14,8);sol.target.position.set(8,0,3.5);sceneR.add(sol,sol.target);
const piso=tex((x)=>{x.fillStyle='#2a2018';x.fillRect(0,0,256,256);for(let i=0;i<8;i++){x.fillStyle=i%2?'#33281d':'#2b2119';x.fillRect(0,i*32,256,31);for(let k=0;k<3;k++){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(((i*71+k*97)%256),i*32,2,31);}}});piso.repeat.set(SALA.w/2,SALA.d/2);
const mPiso=new THREE.MeshStandardMaterial({map:piso,roughness:.7,metalness:.1});
const fl=new THREE.Mesh(new THREE.BoxGeometry(SALA.w,.2,SALA.d),mPiso);fl.position.set(SALA.w/2,-.1,SALA.d/2);fl.receiveShadow=true;sceneR.add(fl);
const mParede=new THREE.MeshStandardMaterial({color:0x6b6272,roughness:.8,metalness:.05});
const mFaixa=new THREE.MeshStandardMaterial({color:0x100a05,emissive:0xff9a3c,emissiveIntensity:1.4});
{const T=.2,H=3;const G=(nx,nz,fn)=>{const g=new THREE.Group();sceneR.add(g);fn(g);WALLS.push({g,nx,nz,s:1});};
 const ad=(g,w,h,d,px,py,pz,m,sh=true)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(px,py,pz);o.castShadow=sh;o.receiveShadow=true;g.add(o);};
 const{w,d}=SALA;
 G(0,-1,g=>{ad(g,w+T,H,T,w/2,H/2,-T/2,mParede);ad(g,w,.06,.03,w/2,.3,.02,mFaixa,false);});
 G(-1,0,g=>{ad(g,T,H,d+T,-T/2,H/2,d/2,mParede);ad(g,.03,.06,d,.02,.3,d/2,mFaixa,false);});
 G(0,1,g=>{ad(g,w+T,H,T,w/2,H/2,d+T/2,mParede);ad(g,w,.06,.03,w/2,.3,d-.02,mFaixa,false);});
 G(1,0,g=>{ad(g,T,H,d+T,w+T/2,H/2,d/2,mParede);ad(g,.03,.06,d,w-.02,.3,d/2,mFaixa,false);});}
{const mm=(w,h,d,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mParede);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;sceneR.add(o);};
 mm(.2,1.1,2.3,PART,.55,1.15);mm(.2,1.1,2.4,PART,.55,5.8);BLK.push([PART-.1,0,.2,2.3],[PART-.1,4.6,.2,2.4]);
 const fx=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,1.5),mFaixa);fx.position.set(PART,1.12,3.5);sceneR.add(fx);}
const lamp2=new THREE.PointLight(0xffa860,30,11,2);lamp2.position.set(12,2.6,3.5);sceneR.add(lamp2);
{const mk2=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.85}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;sceneR.add(m);return m;};
 mk2(2.4,.4,.95,0x3a3040,12.4,.2,5.9);mk2(2.4,.55,.25,0x3a3040,12.4,.62,6.3);mk2(.25,.35,.95,0x2e2634,11.3,.45,5.9);mk2(.25,.35,.95,0x2e2634,13.5,.45,5.9);
 mk2(1.2,.35,.7,0x2a2018,12.4,.18,4.4);mk2(3.6,.02,2.6,0x40283a,12.4,.011,4.6);
 BLK.push([11.1,5.35,2.6,1.1],[11.8,4.0,1.2,.8]);}
/* janelas com a cidade ao fundo */
const texJan=tex((x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0a1230');g.addColorStop(1,'#241a3a');x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<26;i++){const bw=10+Math.random()*26,bh=30+Math.random()*130,bx=Math.random()*w;x.fillStyle='#0a0e1c';x.fillRect(bx,h-bh,bw,bh);
  for(let k=0;k<bh/9;k++)for(let j=0;j<bw/7;j++)if(Math.random()<.1){x.fillStyle=Math.random()<.6?'#ffcc66':'#66e5ff';x.fillRect(bx+2+j*7,h-bh+3+k*9,3,4);}}},256,170);
const mJan=new THREE.MeshBasicMaterial({map:texJan});const mMold=new THREE.MeshStandardMaterial({color:0x1a1410,roughness:.6});
function janela(x,z,rot){const g=new THREE.Group();const p=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.5),mJan);g.add(p);
 for(const[w,h,px,py]of[[2.5,.08,0,.78],[2.5,.08,0,-.78],[.08,1.6,-1.24,0],[.08,1.6,1.24,0],[.05,1.5,0,0]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.1),mMold);m.position.set(px,py,0);g.add(m);}
 g.position.set(x,1.75,z);g.rotation.y=rot;sceneR.add(g);}
janela(3.9,.04,0);janela(6.3,.04,0);janela(.04,4.8,Math.PI/2);janela(10.2,.04,0);janela(14.4,.04,0);
/* cama, tapete */
{const mk=(w,h,d,c,x,y,z,em)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.8,emissive:em||0,emissiveIntensity:em?.6:0}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;sceneR.add(m);return m;};
 mk(2.1,.35,1.3,0x2a2430,3.6,.18,6.0);mk(2.0,.14,1.2,0x7a8a8c,3.6,.42,6.0);mk(.6,.1,1.1,0xd8cfc0,2.9,.54,6.0);mk(.9,.12,1.2,0x2a4a5a,4.3,.5,6.0);
 const r=mk(2.8,.02,2.0,0x3a2418,4.0,.01,3.9);BLK.push([2.55,5.35,2.1,1.3]);}
/* props da sala */
async function montarSala(){for(const e of CENA){const g=(await carregar(e.arquivo)).scene.clone(true);
  g.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>harm(m,1)):harm(o.material,1);o.castShadow=o.receiveShadow=true;}});
  g.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(g),s=b.getSize(new THREE.Vector3());const k=(e.alt?e.alt/s.y:e.tam/Math.max(s.x,s.y,s.z))*(e.escala||1);g.scale.multiplyScalar(k);g.updateMatrixWorld(true);b.setFromObject(g);const c=b.getCenter(new THREE.Vector3());g.position.set(-c.x,-b.min.y,-c.z);
  const w=new THREE.Group();w.add(g);w.rotation.y=THREE.MathUtils.degToRad(e.rot||0);w.position.set(...e.pos);sceneR.add(w);w.updateMatrixWorld(true);
  if(e.col){const bb=new THREE.Box3().setFromObject(w);BLK.push([bb.min.x,bb.min.z,bb.max.x-bb.min.x,bb.max.z-bb.min.z]);}}
 /* drone na base */
 const d=(await carregar('Drone')).scene.clone(true);d.traverse(o=>{if(o.isMesh){o.material=harm(o.material);o.castShadow=true;}});d.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(d),s=b.getSize(new THREE.Vector3());d.scale.multiplyScalar(.55/Math.max(s.x,s.z));
 dockDrone=new THREE.Group();dockDrone.add(d);dockDrone.position.set(6.9,1.5,1.0);sceneR.add(dockDrone);
 const orb=new THREE.PointLight(0x00e5d8,6,3,2);dockDrone.add(orb);}
let dockDrone,gatoM;
const NP=[];
async function npcs(){const prep=async(n,alt,pos,luz)=>{const g=(await carregar(n)).scene.clone(true);g.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;const m=o.material;m.metalness=.1;m.roughness=.8;m.emissive=new THREE.Color(0xffffff);m.emissiveMap=m.map;m.emissiveIntensity=n==='Gato'?.55:.1;if(n==='Iara')m.color=new THREE.Color(0xb59f8c);}});
  g.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(g),s=b.getSize(new THREE.Vector3());g.scale.multiplyScalar(alt/s.y);g.updateMatrixWorld(true);b.setFromObject(g);const c=b.getCenter(new THREE.Vector3());g.position.set(-c.x,-b.min.y,-c.z);
  const w=new THREE.Group();w.add(g);const l=new THREE.PointLight(luz,n==='Gato'?9:3,5,2);l.position.set(0,1.6,0);w.add(l);w.position.set(...pos);sceneR.add(w);return w;};
 const iara=await prep('Iara',1.62,[10.4,0,2.3],0xffd9a0),gato=await prep('Gato',.62,[13.3,0,3.2],0x7dffea);gatoM=gato;
 NP.push({g:iara,id:'iara',spd:.55,pts:[[10.4,2.2],[12.8,2.5],[14.2,3.0],[12.2,3.4],[9.8,3.4]],i:0,wait:1,g2:0,h:0,tgy:.0},{g:gato,id:'gato',spd:1.5,pts:[[13.3,3.2],[10.6,2.2],[14.0,2.0],[12.0,3.6],[10.0,3.3]],i:0,wait:.5,g2:0,h:0,seg:1});}
function npcUpd(dt,t){for(const n of NP){const p=n.g.position,pl2=Math.hypot(pl.x-p.x,pl.y-p.z);let mov=0,tx,tz;
  if(uiOpen&&pl2<3.2){tx=pl.x;tz=pl.y;}
  else if(n.seg&&(n.seg===2?pl2<4.5:pl2<3.6)){n.seg=2;tx=pl.x;tz=pl.y;if(pl2>2.0){const dx=tx-p.x,dz=tz-p.z,l=Math.hypot(dx,dz);p.x+=dx/l*n.spd*.8*dt;p.z+=dz/l*n.spd*.8*dt;mov=1;}}
  else if(n.seg===2&&(n.seg=1,0)){}
  else if(n.wait>0)n.wait-=dt;
  else{const q=n.pts[n.i];tx=q[0];tz=q[1];const dx=tx-p.x,dz=tz-p.z,l=Math.hypot(dx,dz);if(l<.15){n.wait=1.5+Math.random()*3;n.i=Math.floor(Math.random()*n.pts.length);}else{p.x+=dx/l*n.spd*dt;p.z+=dz/l*n.spd*dt;mov=1;}}
  if(tx!==undefined&&Math.hypot(tx-p.x,tz-p.z)>.05){const hd=Math.atan2(tx-p.x,tz-p.z);let dh=hd-n.h;dh=Math.atan2(Math.sin(dh),Math.cos(dh));n.h+=dh*Math.min(1,dt*4);}
  n.g.rotation.y=n.h;n.g2+=dt*(mov?(n.seg?11:7):2);
  n.g.children[0].position.y=0;p.y=mov?Math.abs(Math.sin(n.g2))*(n.seg?.04:.035):Math.sin(n.g2)*.008;n.g.rotation.z=mov?Math.sin(n.g2)*(n.seg?.05:.03):0;
  const T=TG.find(x=>x.id===n.id);if(T){T.x=p.x;T.y=p.z+(n.seg?.5:.6);}}}
const hit=(x,y)=>{const m=.28;if(x<m||y<m||x>SALA.w-m||y>SALA.d-m)return true;for(const[a,b,w,d]of BLK)if(x>a-.22&&x<a+w+.22&&y>b-.22&&y<b+d+.22)return true;return false;};

/* ================= JOGADOR ================= */
const pl={x:4,y:4.3,ph:0,mv:0};let yaw=0,yawT=0,mixer,acao;
const pjG=new THREE.Group();sceneR.add(pjG);
const blob=new THREE.Mesh(new THREE.CircleGeometry(.4,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.45,depthWrite:false}));blob.rotation.x=-Math.PI/2;sceneR.add(blob);
async function jogador(){const gl=await carregar('Personagem'),pj=gl.scene;mixer=new THREE.AnimationMixer(pj);acao=mixer.clipAction(gl.animations[0]);acao.play();
 pj.updateMatrixWorld(true);let bb=new THREE.Box3().setFromObject(pj);pj.scale.multiplyScalar(1.75/(bb.max.y-bb.min.y));pj.updateMatrixWorld(true);bb.setFromObject(pj);pj.position.y-=bb.min.y;pjG.add(pj);
 pj.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=o.receiveShadow=true;const m=o.material;m.metalness=.15;m.roughness=.75;m.emissive=new THREE.Color(0x0a1420);m.emissiveMap=m.map;m.emissiveIntensity=.7;if(m.name&&/hair/i.test(m.name)){m.alphaTest=.5;m.transparent=false;}}});}

/* ================= CIDADE (imagem do drone) ================= */
sceneC.add(new THREE.HemisphereLight(0x3a4f80,0x0a0f1a,3.2));
const lua=new THREE.DirectionalLight(0x6f8fd0,.7);lua.position.set(-60,100,40);sceneC.add(lua);
const rand=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
function winTex(lit){return tex((x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(rand()<lit){x.fillStyle=rand()<.65?'#ffd27a':'#7fe8ff';x.fillRect(c*32+8,r*32+8,16,16);}});}
const TEXd=winTex(.04),TEXl=winTex(.38);
const PM=new Map();function predio(x,z,w,d,h,lit){const tx=lit?TEXl:TEXd;const mk=(rw)=>{const key=lit+'|'+Math.round(h/8)+'|'+Math.round(rw/3);if(PM.has(key))return PM.get(key);const t=tx.clone();t.needsUpdate=true;t.repeat.set(Math.round(rw/3)*3/12,Math.round(h/8)*8/25);t.offset.set(rand(),rand());const m=new THREE.MeshStandardMaterial({color:0x2a3858,emissive:0xffffff,emissiveMap:t,emissiveIntensity:1.2,roughness:.5,metalness:.5});PM.set(key,m);return m;};
 const roof=new THREE.MeshStandardMaterial({color:0x34456a,roughness:.8});const mx=mk(d),mz=mk(w);
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[mx,mx,roof,roof,mz,mz]);m.position.set(x,h/2,z);sceneC.add(m);return m;}
const hot=[];
async function montarCidade(){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshStandardMaterial({color:0x121b2c,roughness:1}));ground.rotation.x=-Math.PI/2;sceneC.add(ground);
 const geo=async n=>{const g=(await carregar(n)).scene;let m;g.traverse(o=>{if(o.isMesh&&!m)m=o;});return m;};
 const roadM=(await geo('road-straight')),cross=(await geo('road-crossroad'));
 const S=CIDADE.tile,L=CIDADE.limite,av=CIDADE.avenidas;
 const mat=new THREE.MeshStandardMaterial({map:roadM.material.map,color:0xb4b4bc,roughness:.6,metalness:.1,emissive:0x15151c,emissiveIntensity:1});
 const straightA=[],straightB=[],crossA=[];
 for(const a of av)for(let t=-L;t<=L;t+=S){const onX=av.includes(t);
  if(onX)continue;straightA.push([t,a,0]);straightB.push([a,t,Math.PI/2]);}
 for(const a of av)for(const b of av)crossA.push([a,b,0]);
 const inst=(g,list,mt)=>{const im=new THREE.InstancedMesh(g.geometry,mt,list.length);const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(S,S,S);list.forEach(([x,z,r],i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),r);M.compose(new THREE.Vector3(x,.02,z),q,s);im.setMatrixAt(i,M);});im.receiveShadow=false;sceneC.add(im);};
 inst(roadM,straightA,mat);inst(roadM,straightB,mat);inst(cross,crossA,mat);
 {const cal=[];for(const a of av)for(let t=-L;t<=L;t+=S){if(av.includes(t))continue;for(const sd of[-1,1]){cal.push([t,a+sd*5.6,0]);cal.push([a+sd*5.6,t,1]);}}
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(S,.28,3.2),new THREE.MeshStandardMaterial({color:0x5c6270,roughness:.95,emissive:0x0c0f16}),cal.length);const M=new THREE.Matrix4(),q=new THREE.Quaternion();
  cal.forEach(([x,z,r],i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),r?Math.PI/2:0);M.compose(new THREE.Vector3(x,.12,z),q,new THREE.Vector3(1,1,1));im.setMatrixAt(i,M);});sceneC.add(im);}
 /* postes de luz e árvores ao longo das avenidas */
 const lampG=await geo('light-square'),poste=[],bulbs=[];
 for(const a of av)for(let t=-L;t<=L;t+=16){for(const sd of[-1,1]){poste.push([t,a+sd*5.2,sd>0?Math.PI:0]);poste.push([a+sd*5.2,t,sd>0?-Math.PI/2:Math.PI/2]);}}
 {const im=new THREE.InstancedMesh(lampG.geometry,new THREE.MeshStandardMaterial({map:lampG.material.map,color:0x8a92a4,roughness:.6,metalness:.3}),poste.length);const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(4.6,4.6,4.6);
  const bm=new THREE.InstancedMesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshBasicMaterial({color:0xcffcff}),poste.length);
  poste.forEach(([x,z,r],i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),r);M.compose(new THREE.Vector3(x,0,z),q,s);im.setMatrixAt(i,M);bm.setMatrixAt(i,new THREE.Matrix4().makeTranslation(x+Math.sin(-r)*-.8,2.85,z+Math.cos(r)*-.8));});sceneC.add(im,bm);
  const gt=tex((x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,226,170,.3)');g.addColorStop(1,'rgba(255,226,170,0)');x.fillStyle=g;x.fillRect(0,0,w,h);},128,128);
  const pm=new THREE.InstancedMesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({map:gt,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),poste.length);
  poste.forEach(([x,z,r],i)=>{M.compose(new THREE.Vector3(x+Math.sin(-r)*-.8,.34,z+Math.cos(r)*-.8),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2),new THREE.Vector3(1,1,1));pm.setMatrixAt(i,M);});sceneC.add(pm);}
 {const n=[];for(const a of av)for(let t=-L;t<=L;t+=20)for(const sd of[-1,1]){if(!av.includes(t+10)){n.push([t+4,a+sd*6.8]);n.push([a+sd*6.8,t+4]);}}
  const tr=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.26,1.7,6),new THREE.MeshStandardMaterial({color:0x4a3626,roughness:1}),n.length),fo=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.25,1),new THREE.MeshStandardMaterial({color:0x2a7a4a,emissive:0x0b2a1a,emissiveIntensity:.7,roughness:.9}),n.length);const M=new THREE.Matrix4();
  n.forEach(([x,z],i)=>{const k=.8+((x*7+z*13)%5)/10;M.compose(new THREE.Vector3(x,.85,z),new THREE.Quaternion(),new THREE.Vector3(1,1,1));tr.setMatrixAt(i,M);M.compose(new THREE.Vector3(x,2.5*k,z),new THREE.Quaternion(),new THREE.Vector3(k,k*1.1,k));fo.setMatrixAt(i,M);});sceneC.add(tr,fo);}
 /* prédios: quadras entre avenidas */
 const centros=Array.from({length:14},(_,i)=>-156+24*i),aurora=[[-36,12],[-12,12],[-36,36],[-12,36]];
 for(const cx of centros)for(const cz of centros){const isA=aurora.some(([x,z])=>x===cx&&z===cz);
  if(cz===-60&&Math.abs(cx)<=36)continue;/* terreno limpo atrás do tapume */
  if(cx===-84&&cz===36)continue;/* quadra da Casa 17 */
  if(isA){predio(cx-4.5,cz,7,13,32,false);predio(cx+4.5,cz,7,13,32,false);}
  else{const baixo=Math.hypot(cx+84,cz-36)<60||(Math.abs(cx)<=60&&Math.abs(cz+60)<=50);const dist=Math.hypot(cx,cz),alto=!baixo&&(cx>0&&cz<0)||dist<60&&rand()<.4;const w=10+rand()*5,d=10+rand()*5,h=baixo?7+rand()*7:alto?55+rand()*45:(dist>110?14+rand()*26:22+rand()*30);predio(cx,cz,w,d,h,alto||rand()<.5);}}
 /* silhueta distante, para a cidade não acabar numa borda */
 {const n=420,im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x1b2744,emissive:0x1a2a50,emissiveIntensity:.5,roughness:.9}),n);const M=new THREE.Matrix4();
  for(let i=0;i<n;i++){const a=rand()*Math.PI*2,r=205+rand()*150,h=20+rand()*70,w=8+rand()*14;M.compose(new THREE.Vector3(Math.cos(a)*r,h/2,Math.sin(a)*r),new THREE.Quaternion(),new THREE.Vector3(w,h,w+rand()*8));im.setMatrixAt(i,M);}sceneC.add(im);}
 /* antenas nos topos */
 const dish=(await carregar('Dish')).scene;for(const [x,z,y] of[[12,-12,70],[36,-36,96],[36,-12,64]]){const d=dish.clone(true);d.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(d),sz=b.getSize(new THREE.Vector3());d.scale.multiplyScalar(5/Math.max(sz.x,sz.y,sz.z));d.position.set(x,y,z);sceneC.add(d);}
 /* ===== Casa 17 e a vizinhança que ficou ===== */
 const casaM=new THREE.MeshStandardMaterial({color:0x6b5a48,roughness:.9,emissive:0x1a1208,emissiveIntensity:.4}),tel=new THREE.MeshStandardMaterial({color:0x3a2a22,roughness:.9});
 const janM=new THREE.MeshBasicMaterial({color:0xffc070});
 const casa=(x,z,r,acesa)=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(6,3,5),casaM);b.position.y=1.5;g.add(b);
  const t=new THREE.Mesh(new THREE.CylinderGeometry(0,4.6,2,4,1),tel);t.rotation.y=Math.PI/4;t.scale.set(1.15,1,1.0);t.position.y=4;g.add(t);
  const w=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),acesa?janM:new THREE.MeshBasicMaterial({color:0x14100c}));w.position.set(0,1.8,2.51);g.add(w);
  g.position.set(x,0,z);g.rotation.y=r;g.scale.setScalar(1.6);sceneC.add(g);};
 [[-77,18,.2,0],[-85,20,-.1,0],[-77,30,0,0],[-85,32,.15,0],[-79,42,-.2,0],[-87,44,.1,0]].forEach(c=>casa(c[0],c[1],c[2],c[3]));
 casa(-81,30.5,.05,1);const l17=new THREE.PointLight(0xffb060,220,45,2);l17.position.set(-81,3,34);sceneC.add(l17);
 const pole=(await carregar('electricity-pole')).scene;for(const [x,z] of[[-73,24],[-73,38],[-73,52]]){const p=pole.clone(true);p.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshStandardMaterial({map:o.material.map,color:0x8d95a8});});p.scale.setScalar(14);p.position.set(x,0,z);sceneC.add(p);}
 /* ===== tapume ===== */
 const fence=await geo('construction-fence');{const list=[];for(let x=-36;x<=36;x+=3)list.push(x);const im=new THREE.InstancedMesh(fence.geometry,new THREE.MeshStandardMaterial({map:fence.material.map,color:0x9aa3b8}),list.length);const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(14,14,14);
  list.forEach((x,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);M.compose(new THREE.Vector3(x,0,-62),q,s);im.setMatrixAt(i,M);});sceneC.add(im);}
 const placa=new THREE.Mesh(new THREE.PlaneGeometry(22,8),new THREE.MeshBasicMaterial({map:tex((x,w,h)=>{x.fillStyle='#e8e2d0';x.fillRect(0,0,w,h);x.fillStyle='#10202c';x.font='bold 46px sans-serif';x.fillText('PROJETO CONCLUÍDO',16,70);x.font='22px sans-serif';x.fillText('Reassentamento: ver Anexo 7',20,110);x.fillText('Consórcio Meridiano',20,140);},512,160)}));placa.position.set(0,5,-61.5);sceneC.add(placa);
 /* ===== transporte autônomo vazio ===== */
 const bus=new THREE.InstancedMesh(new THREE.BoxGeometry(3,2,8),new THREE.MeshStandardMaterial({color:0x1c2638,emissive:0x00e5d8,emissiveIntensity:.5}),6);sceneC.userData.bus=bus;sceneC.add(bus);
 /* pontos de observação */
 hot.push({id:'p1',pos:new THREE.Vector3(-24,26,24),nome:'Quadra Aurora'},{id:'p2',pos:new THREE.Vector3(-81,8,31),nome:'Casa 17'},{id:'p3',pos:new THREE.Vector3(0,9,-61),nome:'Tapume'},{id:'fl',pos:new THREE.Vector3(24,70,-24),nome:'Torre central'});}
const FLAV={fl:['Torre central','Quase todas as janelas estão acesas e nenhuma silhueta aparece nelas. Segundo o painel, são escritórios de fundos de investimento. Esta observação é só de contexto e não entra no caderno.']};
/* ================= DRONE ================= */
const dr={...DRONE};let dragging=null;
function entrarFeed(sem){modo='feed';dockDrone.visible=false;rp.scene=sceneC;rp.camera=camC;$('#feedui').style.display='block';document.body.classList.add('feed');{let vb=document.getElementById('voltar');if(!vb){vb=document.createElement('button');vb.id='voltar';vb.textContent='Voltar à sala (Esc)';vb.style.cssText='position:absolute;left:14px;bottom:34px;z-index:7;pointer-events:auto;font:inherit;cursor:pointer;color:#9ff;background:rgba(4,12,22,.9);border:1px solid #00e5d8;padding:.4em .8em';vb.onclick=()=>{if(F.on)return;closeUI();sairFeed();};$('#feedui').appendChild(vb);}}
 if(!sem&&!st.dv){st.dv=1;A.ajudaD();}else if(!sem)toast('Drone no ar. H: ajuda de controles.',4000);}
function sairFeed(){if(modo!=='feed')return;modo='sala';dockDrone.visible=true;rp.scene=sceneR;rp.camera=camR;$('#feedui').style.display='none';document.body.classList.remove('feed');$('#marks').innerHTML='';}
let lst;function lista(){if(!lst){lst=document.createElement('div');lst.style.cssText='position:absolute;right:14px;top:14px;display:flex;flex-direction:column;gap:6px;z-index:6;pointer-events:auto;max-width:300px';$('#feedui').appendChild(lst);
  hot.filter(h=>h.f===(st.f2?2:1)).forEach(h=>{const b=document.createElement('button');b.dataset.id=h.id;b.style.cssText='font:inherit;font-size:.85em;text-align:left;cursor:pointer;color:#9ff;background:rgba(4,12,22,.85);border:1px solid #00e5d8;padding:.35em .7em';b.onclick=()=>examinar(h);lst.appendChild(b);});}
 for(const b of lst.children){const h=hot.find(x=>x.id===b.dataset.id),d=h.pos.distanceTo(camC.position),perto=d<=DRONE.alcance;b.style.borderColor=perto?'#7dff9a':'#00e5d8';b.style.color=(st.p[h.id]||st.q[h.id])?'#7a8a9a':perto?'#7dff9a':'#9ff';
  b.textContent=(st.p[h.id]?'✓ ':perto?'● ':'➜ ')+h.nome+' · '+Math.round(d)+' m · '+((st.p[h.id]||st.q[h.id])?'anotado':perto?'PERTO: clique p/ observar':'clique p/ ir até lá')+(h.id==='fl'?' (contexto)':'');}}
function marcadores(){lista();const box=$('#marks');box.style.display=uiOpen?'none':'block';for(const h of hot)if(h.beam)h.beam.visible=h.f===(st.f2?2:1);
 if(!box.children.length)hot.filter(h=>h.f===(st.f2?2:1)).forEach(h=>{const b=document.createElement('button');b.dataset.id=h.id;b.onclick=()=>examinar(h);box.appendChild(b);});
 for(const b of box.children){const h=hot.find(x=>x.id===b.dataset.id),v=h.pos.clone().project(camC),d=h.pos.distanceTo(camC.position);
  const vis=v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;b.style.display=vis?'block':'none';if(!vis)continue;
  b.style.left=((v.x+1)/2*innerWidth)+'px';b.style.top=((1-v.y)/2*innerHeight)+'px';b.className=(d>DRONE.alcance?'far ':'')+((st.p[h.id]||st.q[h.id])?'done':'');
  b.textContent=((st.p[h.id]||st.q[h.id])?'✓ ':d>DRONE.alcance?'➜ ':'● ')+h.nome+(d>DRONE.alcance?' · '+Math.round(d)+' m · clique p/ ir':' · PERTO · clique p/ observar');}}
function examinar(h){const d=h.pos.distanceTo(camC.position);if(d>DRONE.alcance){const c=[[26,0],[-26,0],[0,26],[0,-26]].sort((a,b)=>Math.hypot(h.pos.x+a[0]-dr.x,h.pos.z+a[1]-dr.z)-Math.hypot(h.pos.x+b[0]-dr.x,h.pos.z+b[1]-dr.z))[0];
  const x=h.pos.x+c[0],z=h.pos.z+c[1],y=Math.max(62,h.pos.y+55),dx=h.pos.x-x,dz=h.pos.z-z,hz=Math.hypot(dx,dz);dr.go={x,y,z,h,yaw:Math.atan2(-dx,-dz),pitch:Math.max(-1.25,Math.atan2(h.pos.y-y,hz))};toast('Drone indo até '+h.nome+'. Ao chegar, a observação abre sozinha.',4500);return;}
 const p=PISTAS[h.id]||PQ[h.id]||FLAV[h.id];ui(`<h2>${p[0]}</h2><p>${p[1]}</p>`+((PISTAS[h.id]||PQ[h.id])?((st.p[h.id]||st.q[h.id])?'<p class="sm">Já anotado no caderno.</p>':bt('reg',`Anotar no caderno de campo`,h.id)):'')+bt('close','Voltar ao drone'));}
A.reg=id=>{pista(id);closeUI();};

/* ===== LUTA DE DRONES ===== */
const F={on:0,hp:100,cd:0,emp:0,fl:0,en:[],bolts:[],me:null,hud:null,C:new THREE.Vector3(-60,62,120),P:new THREE.Vector3(),res:0};
const bGeo=new THREE.SphereGeometry(.7,8,6),bP=new THREE.MeshBasicMaterial({color:0x7dffea}),bE=new THREE.MeshBasicMaterial({color:0xff4a2a});
async function droneMesh(esc,cor){const d=(await carregar('Drone')).scene.clone(true);d.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(cor);o.material.emissiveIntensity=.55;}});
 d.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(d),s=b.getSize(new THREE.Vector3());d.scale.multiplyScalar(esc/Math.max(s.x,s.z));d.updateMatrixWorld(true);const c=new THREE.Box3().setFromObject(d).getCenter(new THREE.Vector3());d.position.sub(c);
 const g=new THREE.Group();g.add(d);const l=new THREE.PointLight(cor,6,14,2);g.add(l);sceneC.add(g);return g;}
async function startFight(){closeUI();if(modo!=='feed')entrarFeed(1);toast('Drones de segurança do Consórcio interceptaram o seu. Espaço ou clique: disparar · A/D/W/S/R/F: desviar · E: pulso EMP.',7000);
 if(lst)lst.style.display='none';$('#marks').style.display='none';
 for(const e of F.en)sceneC.remove(e.m);for(const b of F.bolts)sceneC.remove(b.m);F.en=[];F.bolts=[];if(F.me)sceneC.remove(F.me);
 F.me=await droneMesh(3.2,0x00e5d8);F.P.copy(F.C);F.hp=100;F.cd=0;F.emp=0;F.fl=0;F.res=0;
 for(let i=0;i<3;i++){const m=await droneMesh(4,0xff2a40);F.en.push({m,hp:110,max:110,ph:i*2.1,sh:1.5+i*.7,ox:(i-1)*26,oy:i%2?6:0});}
 if(!F.hud){F.hud=document.createElement('div');F.hud.className='bev';F.hud.style.cssText='position:absolute;left:50%;bottom:44px;transform:translateX(-50%);padding:.5em 1em;z-index:6;font-size:.9em;text-align:center;pointer-events:none;--ch:10px';$('#feedui').appendChild(F.hud);}
 F.hud.style.display='block';F.on=1;}
const bar=(h,m,c)=>`<span style="display:inline-block;width:90px;height:8px;background:#10182a;border:1px solid ${c};vertical-align:middle"><i style="display:block;height:100%;width:${Math.max(0,h/m*100)}%;background:${c}"></i></span>`;
function atira(from,to,vel,tipo,alvo){const m=new THREE.Mesh(bGeo,tipo?bE:bP);m.position.copy(from);sceneC.add(m);F.bolts.push({m,v:to.clone().sub(from).normalize().multiplyScalar(vel),t:3,tipo,alvo,vel});}
function fightEnd(v){F.on=0;F.hud.style.display='none';for(const e of F.en)sceneC.remove(e.m);for(const b of F.bolts)sceneC.remove(b.m);F.en=[];F.bolts=[];sceneC.remove(F.me);F.me=null;
 if(v){if(lst)lst.style.display='';sairFeed();toast('Os drones do Consórcio caíram. A transmissão foi preservada e o seu drone voltou para a base.',6000);if(nP()>=0)st.fim=st.fim||0;upObj();}
 else ui(`<h2 style="color:#ff4fd8">Drone abatido</h2><p>A transmissão cai por alguns segundos e volta com a imagem do Consórcio.</p>`+bt('lutar','Tentar de novo','','on')+bt('fugir','Desistir e voltar à sala'));}
A.fugir=()=>{closeUI();if(lst)lst.style.display='';sairFeed();};
function fightUpdate(dt,t){
 const me=F.me;if(!me)return;const sp=24*dt;
 if(!uiOpen){F.P.x+=((keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0))*sp;F.P.z+=((keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0))*sp;F.P.y+=((keys.r?1:0)-(keys.f?1:0))*sp;}
 F.P.x=Math.max(F.C.x-38,Math.min(F.C.x+38,F.P.x));F.P.z=Math.max(F.C.z-14,Math.min(F.C.z+14,F.P.z));F.P.y=Math.max(F.C.y-14,Math.min(F.C.y+12,F.P.y));
 me.position.copy(F.P);me.rotation.z=((keys.a?1:0)-(keys.d?1:0))*.25;
 camC.position.set(F.P.x,F.P.y+9,F.P.z+22);camC.lookAt(F.P.x,F.P.y-2,F.P.z-18);
 F.cd-=dt;F.emp-=dt;F.fl=Math.max(0,F.fl-dt);
 const vivos=F.en.filter(e=>e.hp>0);
 if(!uiOpen&&keys[' ']&&F.cd<=0&&vivos.length){const alvo=vivos.reduce((a,b)=>a.m.position.distanceTo(F.P)<b.m.position.distanceTo(F.P)?a:b);atira(F.P,alvo.m.position,75,0,alvo);F.cd=.3;}
 if(!uiOpen&&keys.e&&F.emp<=0){F.emp=7;F.fl=.4;for(const e of vivos)if(e.m.position.distanceTo(F.P)<70)e.hp-=26;toast('Pulso EMP!',1200);}
 for(const e of F.en){if(e.hp<=0){e.m.visible=false;continue;}
  e.m.position.set(F.C.x+e.ox+Math.sin(t*.7+e.ph)*20,F.C.y+e.oy+Math.sin(t*1.1+e.ph)*5,F.C.z-48+Math.sin(t*.4+e.ph)*6);e.m.rotation.y=Math.PI;
  e.sh-=dt;if(e.sh<=0){e.sh=1.5+Math.random()*1.4;atira(e.m.position,F.P,34,1);}}
 for(const b of F.bolts){b.t-=dt;if(b.alvo&&b.alvo.hp>0){const d=b.alvo.m.position.clone().sub(b.m.position).normalize().multiplyScalar(b.vel);b.v.lerp(d,Math.min(1,dt*6));}b.m.position.addScaledVector(b.v,dt);
  if(b.tipo){if(b.m.position.distanceTo(F.P)<2.2){F.hp-=8;b.t=0;F.fl=.15;}}
  else for(const e of vivos){if(e.hp>0&&b.m.position.distanceTo(e.m.position)<2.8){e.hp-=10+2*nP();b.t=0;}}}
 for(let i=F.bolts.length-1;i>=0;i--)if(F.bolts[i].t<=0){sceneC.remove(F.bolts[i].m);F.bolts.splice(i,1);}
 F.hud.innerHTML=`<b style="color:#00e5d8">SEU DRONE</b> ${bar(F.hp,100,'#00e5d8')} ${Math.max(0,F.hp)} &nbsp;|&nbsp; `+F.en.map((e,i)=>`<b style="color:#ff4fd8">C${i+1}</b> ${bar(e.hp,e.max,'#ff4fd8')}`).join(' ')+` &nbsp;|&nbsp; EMP: ${F.emp>0?Math.ceil(F.emp)+'s':'<b style="color:#7dff9a">pronto (E)</b>'}`;
 if(F.en.every(e=>e.hp<=0)&&!F.res){F.res=1;setTimeout(()=>fightEnd(1),600);}
 else if(F.hp<=0&&!F.res){F.res=1;fightEnd(0);}
}
A.lutar=startFight;
A.luta=()=>ui(`<h2 style="color:#ff4fd8">Interceptação do Consórcio</h2><p>Quando um drone de auditoria sai da rota aprovada, o Consórcio manda drones de segurança para derrubá-lo e apagar a transmissão. Eles não discutem o que você viu. Se o seu drone cair, a imagem some e o que você filmou fica sem prova.</p><p>Objetivo: derrubar os três drones vermelhos antes que derrubem o seu.</p><h3>Como jogar</h3><p>A / D: mover para os lados · W / S: frente e trás · R / F: subir e descer<br>Espaço ou clique: atirar (o tiro persegue o alvo mais próximo)<br>E: pulso EMP, dano nos três (recarrega em 7 s)<br>Desvie dos tiros laranja. Cada pista no caderno aumenta o dano dos seus tiros.</p>`+bt('lutar','Entrar em combate','','on')+bt('close','Voltar'));
addEventListener('pointerdown',()=>{if(F.on)keys[' ']=1;});addEventListener('pointerup',()=>{if(F.on)keys[' ']=0;});
/* ===== NPCs ===== */
const IARA={0:'Você ainda não leu o termo? Lê antes de abrir o painel. Quem assina sem ler costuma descobrir depois o que assinou.',
 1:'Pelo painel está tudo verde, então a câmera é que vai dizer se bate. Olha janela acesa, medidor, placa pequena.',
 2:'Já tem coisa anotada no caderno. Antes de assinar, relê o que você escreveu. O certificado depois não volta atrás.',
 3:'O Consórcio não gosta de drone fora de rota. Se aparecer gente na porta, o Bit avisa.',
 4:'Segunda parte, mesma pergunta: quem ocupa esses empregos? Se você achar o entregador, vê de onde ele sai.',
 5:'Vaga que pede comprovante de endereço some para quem perdeu o endereço na limpeza de base. Anota isso.'};
A.iara=()=>{const n=st.f2?nQ():nP();let k=!st.termo?0:!st.feed?1:st.fim&&!st.f2?3:st.f2?(n>=3?5:4):(n>=3?2:1);ui(`<h2>Iara</h2><p class="sm">mora com você · senta no sofá com um olho na tela</p><p>${IARA[k]}</p>`+bt('close','Valeu'));};
A.gato=()=>{const al=hot.filter(h=>h.f===(st.f2?2:1)&&!(st.p[h.id]||st.q[h.id])).map(h=>h.nome);
 ui(`<h2>Bit</h2><p class="sm">gato-robô · ronrona em 440 Hz</p><p>${st.feed?(al.length?'Alvos ainda sem registro: '+al.join(', ')+'. Pelo drone, clica no nome na lista e ele vai sozinho.':'Todos os alvos desta fase já estão no caderno. Falta decidir no certificado.'):'Bateria do drone: 100%. Sinal estável. Recomendo o terminal, a mesa da direita.'}</p><p class="sm">Se ele fizer miau de alerta, tem algo vindo.</p>`+bt('close','Fechar'));};
/* ===== BATALHA CONTRA A ARANHA DE OBRA ===== */
const Bo={on:0,hp:600,max:600,ph:100,sh:0,m:null,p:new THREE.Vector3(13,0,3.5),att:null,cd:2,stun:0,fire:0,tele:[],proj:[],pick:null,pt:0,res:0,hud:null,say:0,half:0};
const bossMsg=(m)=>{if(Bo.say<0.01){toast(m,2200);Bo.say=3;}};
function hurt(d){if(Bo.sh){Bo.sh=0;toast('O escudo absorveu o golpe.',1500);return;}Bo.ph-=d;}
async function startBoss(){closeUI();
 for(const x of Bo.tele)sceneR.remove(x.m);for(const x of Bo.proj)sceneR.remove(x.m);if(Bo.m)sceneR.remove(Bo.m);if(Bo.pick)sceneR.remove(Bo.pick);
 Bo.tele=[];Bo.proj=[];Bo.hp=Bo.max;Bo.ph=100;Bo.sh=0;Bo.att=null;Bo.cd=2.5;Bo.stun=0;Bo.fire=0;Bo.res=0;Bo.half=0;Bo.say=0;Bo.p.set(13,0,3.5);
 const g=(await carregar('Aranha')).scene.clone(true);g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g),sz=b.getSize(new THREE.Vector3());g.scale.multiplyScalar(3.4/Math.max(sz.x,sz.z));g.updateMatrixWorld(true);const b2=new THREE.Box3().setFromObject(g),c=b2.getCenter(new THREE.Vector3());g.position.set(-c.x,-b2.min.y,-c.z);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material=o.material.clone();o.material.metalness=Math.min(.5,o.material.metalness||0);o.material.emissive=new THREE.Color(0x200508);}});
 Bo.m=new THREE.Group();Bo.m.add(g);const rl=new THREE.PointLight(0xff2a40,18,9,2);rl.position.y=1.2;Bo.m.add(rl);Bo.m.position.copy(Bo.p);sceneR.add(Bo.m);
 const e=(await carregar('Escudo')).scene.clone(true);e.updateMatrixWorld(true);const eb=new THREE.Box3().setFromObject(e),es=eb.getSize(new THREE.Vector3());e.scale.multiplyScalar(.6/Math.max(es.x,es.y,es.z));e.updateMatrixWorld(true);const ec=new THREE.Box3().setFromObject(e).getCenter(new THREE.Vector3());e.position.sub(ec);
 Bo.pick=new THREE.Group();Bo.pick.add(e);Bo.pick.add(new THREE.PointLight(0x7dffea,6,3,2));Bo.pick.position.set(4,.8,2);sceneR.add(Bo.pick);
 pl.x=3.5;pl.y=3.8;
 if(!Bo.hud){Bo.hud=document.createElement('div');Bo.hud.className='bev';Bo.hud.style.cssText='position:fixed;left:50%;bottom:44px;transform:translateX(-50%);padding:.5em 1em;z-index:6;font-size:.9em;text-align:center;pointer-events:none;--ch:10px';document.body.appendChild(Bo.hud);}
 Bo.hud.style.display='block';Bo.on=1;toast('Bit: ela entrou pela janela de serviço. Espaço joga as páginas do caderno. Fica longe dos círculos vermelhos.',6500);}
A.boss=()=>ui(`<h2 style="color:#ff4fd8">Aranha de Obra</h2><p>Quando um auditor contesta o relatório, o Consórcio manda a Aranha de Obra. Ela foi feita para demolir e desobstruir terreno, e agora desobstrui o que atrapalha o cronograma. Se ela te alcançar, as anotações do caderno somem junto com o resto.</p><p>Objetivo: derrubar a Aranha antes que ela derrube você.</p><h3>Como jogar</h3><p>WASD ou setas: mover · Q / R: girar a câmera<br>Espaço: jogar uma página do caderno (mira sozinha na Aranha; cada observação anotada aumenta o dano)<br>Círculo vermelho no chão: golpe em 1 segundo, saia de dentro<br>Linha vermelha: ela vai avançar. Depois do avanço ela fica tonta por uns segundos e leva o dobro de dano<br>Pegue o escudo azul no chão: ele absorve um golpe.</p>`+bt('bossgo','Entrar em combate','','on')+bt('close','Voltar'));
A.bossgo=startBoss;
A.bossfugir=()=>{closeUI();};
function bossEnd(v){Bo.on=0;Bo.hud.style.display='none';for(const x of Bo.tele)sceneR.remove(x.m);for(const x of Bo.proj)sceneR.remove(x.m);Bo.tele=[];Bo.proj=[];if(Bo.pick){sceneR.remove(Bo.pick);Bo.pick=null;}
 if(v){const m=Bo.m;Bo.m=null;sceneR.remove(m);toast('A Aranha desabou. Iara: "Anota isso no relatório."',7000);}
 else{ui(`<h2 style="color:#ff4fd8">Derrubada</h2><p>A Aranha te encurrala perto da porta e as páginas se espalham pelo chão.</p>`+bt('bossgo','Tentar de novo','','on')+bt('bossfugir','Desistir'));}}
function ring(x,z,r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,40),new THREE.MeshBasicMaterial({color:0xff2a40,transparent:true,opacity:.35,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.04,z);sceneR.add(m);return m;}
function bossUpdate(dt,t){
 if(!Bo.m)return;Bo.say-=dt;Bo.cd-=dt;Bo.fire-=dt;const P=new THREE.Vector3(pl.x,0,pl.y),d=P.clone().sub(Bo.p),dist=d.length();
 if(Bo.stun>0){Bo.stun-=dt;Bo.m.rotation.z=Math.sin(t*30)*.03;}else Bo.m.rotation.z=0;
 if(!Bo.half&&Bo.hp<Bo.max/2){Bo.half=1;toast('Iara: ela tá mais rápida. Segura aí!',3000);}
 const att=Bo.att;
 if(att){att.t+=dt;
  if(att.k==='slam'){if(att.t>=1.1){for(const c of att.c){if(Math.hypot(pl.x-c.x,pl.y-c.z)<2.3)hurt(18);sceneR.remove(c.m);}Bo.att=null;Bo.cd=Bo.half?1.4:2.4;}}
  else if(att.k==='dash'){
   if(att.t<.9){const o=att.m;o.material.opacity=.25+.2*Math.sin(t*20);}
   else if(att.t<1.5){Bo.p.addScaledVector(att.dir,16*dt);if(Bo.p.distanceTo(P)<2.1&&!att.hit){att.hit=1;hurt(22);}}
   else{sceneR.remove(att.m);Bo.att=null;Bo.stun=2.4;Bo.cd=1.2;bossMsg('Iara: ela travou! Joga as páginas!');}}
 }else if(Bo.stun<=0){
  if(dist>2.6)Bo.p.addScaledVector(d.normalize(),(Bo.half?2.4:1.7)*dt);
  if(Bo.cd<=0){const r=Math.random(),dash=r<.4;
   if(dash){const dir=d.clone().normalize();const m=new THREE.Mesh(new THREE.PlaneGeometry(14,1.8),new THREE.MeshBasicMaterial({color:0xff2a40,transparent:true,opacity:.35,depthWrite:false}));m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(dir.z,dir.x);m.position.set(Bo.p.x+dir.x*7,.04,Bo.p.z+dir.z*7);sceneR.add(m);Bo.att={k:'dash',t:0,dir,m};bossMsg('Bit: ela vai avançar. Sai da linha!');}
   else{const c=[{x:pl.x,z:pl.y}];if(Bo.half)c.push({x:pl.x+(Math.random()*4-2),z:pl.y+(Math.random()*3-1.5)});c.forEach(q=>q.m=ring(q.x,q.z,2.3));Bo.att={k:'slam',t:0,c};bossMsg('Bit: sai do círculo vermelho!');}}}
 Bo.p.x=Math.max(1,Math.min(15,Bo.p.x));Bo.p.z=Math.max(.9,Math.min(6.1,Bo.p.z));
 Bo.m.position.set(Bo.p.x,Math.sin(t*9)*.04,Bo.p.z);Bo.m.rotation.y=Math.atan2(d.x,d.z);
 /* tiro do jogador */
 if(!uiOpen&&keys[' ']&&Bo.fire<=0){Bo.fire=.35;const m=new THREE.Mesh(new THREE.BoxGeometry(.3,.03,.4),new THREE.MeshBasicMaterial({color:0xfff1b0}));m.position.set(pl.x,1.1,pl.y);sceneR.add(m);Bo.proj.push({m,v:Bo.p.clone().setY(1).sub(m.position).normalize().multiplyScalar(18),t:2});}
 for(const q of Bo.proj){q.t-=dt;q.m.position.addScaledVector(q.v,dt);q.m.rotation.y+=dt*14;if(q.m.position.distanceTo(new THREE.Vector3(Bo.p.x,1,Bo.p.z))<1.8){Bo.hp-=(10+2*(nP()+nQ()))*(Bo.stun>0?2:1);q.t=0;}}
 for(let i=Bo.proj.length-1;i>=0;i--)if(Bo.proj[i].t<=0){sceneR.remove(Bo.proj[i].m);Bo.proj.splice(i,1);}
 /* escudo */
 if(Bo.pick){if(Bo.pick.visible){Bo.pick.rotation.y+=dt*2;Bo.pick.position.y=.8+Math.sin(t*3)*.1;if(Math.hypot(pl.x-Bo.pick.position.x,pl.y-Bo.pick.position.z)<.9){Bo.sh=1;Bo.pick.visible=false;Bo.pt=16;toast('Escudo pego. Ele absorve um golpe.',2000);}}
  else if(!Bo.sh){Bo.pt-=dt;if(Bo.pt<=0){Bo.pick.position.set(2+Math.random()*12,.8,1+Math.random()*5);Bo.pick.visible=true;}}}
 const bar=(h,m,c)=>`<span style="display:inline-block;width:110px;height:8px;background:#10182a;border:1px solid ${c};vertical-align:middle"><i style="display:block;height:100%;width:${Math.max(0,h/m*100)}%;background:${c}"></i></span>`;
 Bo.hud.innerHTML=`<b style="color:#00e5d8">VOCÊ</b> ${bar(Bo.ph,100,'#00e5d8')} ${Math.max(0,Math.round(Bo.ph))} &nbsp;|&nbsp; <b style="color:#ff4fd8">ARANHA</b> ${bar(Bo.hp,Bo.max,'#ff4fd8')} ${Bo.stun>0?'<b style="color:#ffb13b">TONTA</b>':''} &nbsp;|&nbsp; Escudo: ${Bo.sh?'<b style="color:#7dff9a">ativo</b>':'não'} &nbsp;|&nbsp; Espaço: lançar página`;
 if(Bo.hp<=0&&!Bo.res){Bo.res=1;setTimeout(()=>bossEnd(1),700);}
 else if(Bo.ph<=0&&!Bo.res){Bo.res=1;bossEnd(0);}}

/* ===== FASE 2 · TRABALHO E RENDA ===== */
A.ajuda=()=>ui(`<h2>Como jogar</h2><h3>Andar e olhar</h3><p>WASD ou setas: andar · Q / R: girar a câmera · Z / X: inclinar · roda do mouse ou + / −: zoom · C: câmera padrão · H: abrir esta ajuda.</p><h3>Interagir</h3><p>Chegue perto de um objeto até aparecer "E ..." embaixo da tela e aperte E.</p><h3>O que cada coisa faz</h3><p><b>Termo de Conclusão</b> (mesa à esquerda): o que você foi contratada para assinar.<br><b>Painel de indicadores</b>: o que a cidade diz de si mesma.<br><b>Terminal do drone</b> (mesa do fundo): lança o drone sobre Meridiano.<br><b>Caderno de campo</b>: guarda tudo que você registra pelo drone.<br><b>Certificado de conclusão</b> (impressora no canto): onde você assina, marca como pendente ou pede vistoria. Também é de lá que sai o confronto com o Consórcio, depois que você lança o drone.<br><b>Armário e cama</b>: coisas da casa. <b>Iara e Bit</b>, na sala ao lado, ajudam com dicas e avisos.</p><h3>Ordem sugerida</h3><p>Termo → Painel → Terminal (drone) → observar os alvos → Caderno → Certificado.</p>`+bt('close','Entendi'));
A.ajudaD=()=>ui(`<h2>Controles do drone</h2><p>WASD: mover · setas: olhar para os lados e para cima ou baixo · R / F ou roda do mouse: subir e descer · 1: rente ao chão · 2: voo rasante · 3: visão alta · arrastar o mouse: girar · H: esta ajuda · Esc: voltar à sala.</p><h3>Como observar</h3><p>A lista no canto superior direito mostra os alvos. Clique em um nome: o drone voa sozinho até lá e abre a observação. Verde quer dizer que o alvo está perto. Feixes de luz no céu marcam onde cada alvo está. Em cada observação, aperte "Anotar no caderno".</p>`+bt('close','Entendi'));
A.fase2=()=>{st.f2=1;st.q={};st.pn2=0;st.feed2=0;st.fim2=0;OB.length=0;OB.push(['painel','Conferir Trabalho e renda no painel',()=>st.pn2,'painel'],['feed','Lançar o drone no terminal',()=>st.feed2,'terminal'],['pistas','Reunir observações',()=>nQ()>=4,'arquivo'],['fim','Decidir no certificado',()=>st.fim2,'impressora']);
 if(lst){lst.remove();lst=null;}$('#marks').innerHTML='';upObj();ui(`<h2>Indicador 2 · Trabalho e renda</h2>`+call('sis','MERIDIANA','assistente do projeto','O indicador de Trabalho e renda está conforme: 11.400 postos criados contra uma meta de 10.000. Posso emitir o certificado quando quiser.')+`<p class="sm">O mesmo drone, uma segunda pergunta: quem ocupa esses postos?</p>`+bt('close','Começar a auditoria'));};
const painel1=A.painel;A.painel=()=>{if(!st.f2)return painel1();st.pn2=1;upObj();ui(`<h2>Painel de indicadores · Trabalho e renda</h2><table><tr><th>Indicador</th><th>Meta</th><th>Resultado</th><th></th></tr><tr><td>Postos de trabalho criados</td><td>10.000</td><td>11.400</td><td class="ok">conforme</td></tr><tr><td>Renda média</td><td>+10%</td><td>+18%</td><td class="ok">conforme</td></tr><tr><td>Desemprego</td><td>menor que 6%</td><td>4,1%</td><td class="ok">conforme</td></tr></table>`+bt('det2','Detalhar postos de trabalho')+bt('close','Sair'));};
A.det2=()=>{ui(`<h2>Postos de trabalho · detalhe</h2>`+(nQ()?`<p>Vínculo formal na cidade: <b>3.500</b><br>Terceirizadas externas e plataforma: <b>7.900</b><br>Famílias reassentadas contratadas: <b>41</b> de 612</p><p class="sm">Todos entram na mesma conta de "postos criados".</p>`:'<p class="sm">Campo recolhido. Só abre com uma observação de campo anexada.</p>')+bt('painel','‹ Voltar'));};
const imp1=A.impressora;A.impressora=()=>{if(!st.f2)return imp1();ui(`<h2>Certificado de Conclusão · Trabalho e renda</h2>`+call('sis','MERIDIANA','assistente do projeto','Todos os indicadores constam como conformes. Recomendo assinar.')+`<p class="sm">Observações no caderno: ${nQ()} de 4.</p>`+(st.feed2?bt('boss','Receber a Aranha de Obra (confronto)','','on'):'')+bt('dec2','Assinar como conforme','c')+bt('dec2','Marcar Trabalho e renda como pendente','p')+bt('dec2','Solicitar vistoria presencial','v')+bt('close','Voltar'));};
A.dec2=v=>{const n=nQ();
 if(v==='p'&&n<3){ui(`<h2>Justificativa insuficiente</h2><p>Uma pendência precisa de pelo menos três observações anexadas. Há ${n}.</p>`+bt('impressora','‹ Voltar'));return;}
 if(v==='v'&&!st.q.q4){ui(`<h2>Pedido sem fundamento</h2><p>Uma vistoria exige uma evidência sobre os critérios de acesso às vagas.</p>`+bt('impressora','‹ Voltar'));return;}
 const t={c:'O certificado sai. Trabalho e renda continua verde. Os 7.900 postos terceirizados contam como emprego criado e nenhuma das famílias removidas aparece na folha.',
  p:'A pendência chega ao Consórcio. O indicador de Participação, que citava as vagas na consulta de 2019, passa a amarelo. O entregador continua na rua, mas há agora um número no relatório que o inclui.',
  v:'O pedido de vistoria cita o filtro de endereço. A coordenação pede nova autorização e o painel de vagas ganha uma nota de rodapé.'}[v];
 st.fim2=1;upObj();ui(`<h2 style="color:#ffb13b">Fase 2 concluída</h2><p>${t}</p><p class="sm">Próximo indicador: Participação.</p>`+(v==='c'?'':bt('boss','Atender a porta de serviço','','on'))+bt('close','Continuar na sala'));};
/* ================= LOOP ================= */
const dicaEl=document.createElement('div');dicaEl.className='sm';dicaEl.style.cssText='position:fixed;left:12px;bottom:8px;z-index:4;color:#7fb;opacity:.8;font-size:.72em;pointer-events:none';document.body.appendChild(dicaEl);
const keys={};addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=1;if(!started)return;
 if(k==='escape'){if(F.on||Bo.on)return;if(modo==='feed'){closeUI();sairFeed();}else if(uiOpen)closeUI();}
 if(modo==='sala'&&!uiOpen){if((k==='e'||k==='enter'||k===' ')&&!Bo.on)interact();if(k==='q')camAT-=Math.PI/2;if(k==='r')camAT+=Math.PI/2;if(k==='z')CAM.elev=Math.max(.25,CAM.elev-.15);if(k==='x')CAM.elev=Math.min(1.7,CAM.elev+.15);if(k==='c'){CAM.elev=.82;camAT=Math.PI/4;CAM.zoom=9;resize();}if(k==='+'||k==='='){CAM.zoom=Math.max(5,CAM.zoom*.9);resize();}if(k==='-'){CAM.zoom=Math.min(16,CAM.zoom*1.1);resize();}}
 if(modo==='feed'&&!uiOpen&&!F.on){const pr={'1':[3,-.04],'2':[14,-.3],'3':[70,-1.0]}[k];if(pr){dr.go=null;dr.y=pr[0];dr.pitch=pr[1];toast({'1':'Visão rente ao chão','2':'Voo rasante','3':'Visão alta'}[k],1500);}}
 if(k==='h'&&!uiOpen&&!F.on&&!Bo.on)(modo==='feed'?A.ajudaD:A.ajuda)();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0;});addEventListener('blur',()=>{for(const k in keys)keys[k]=0;});
cv.addEventListener('pointerdown',e=>{if(started&&!uiOpen){dragging=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);}});addEventListener('pointerup',()=>dragging=null);
addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-dragging[0],dy=e.clientY-dragging[1];dragging=[e.clientX,e.clientY];
 if(modo==='feed'){dr.yaw-=dx*.005;dr.pitch=Math.min(.6,Math.max(-1.5,dr.pitch-dy*.004));}else{camAT+=dx*.008;camA=camAT;CAM.elev=Math.min(1.7,Math.max(.4,CAM.elev+dy*.004));}});
cv.addEventListener('wheel',e=>{e.preventDefault();if(modo==='sala'){CAM.zoom=Math.min(16,Math.max(5,CAM.zoom*(1+Math.sign(e.deltaY)*.08)));resize();}else if(modo==='feed'&&!F.on){dr.go=null;dr.y=Math.min(150,Math.max(2.5,dr.y+Math.sign(e.deltaY)*4));}},{passive:false});
const near=()=>TG.find(t=>Math.hypot(pl.x-t.x,pl.y-t.y)<1.25);
function interact(){const t=near();if(t&&A[t.id])A[t.id]();}
const camP=new THREE.Vector3(4,0,3.5);let camA=Math.PI/4,camAT=Math.PI/4;
const mk=document.createElement('canvas');mk.width=mk.height=64;{const x=mk.getContext('2d');x.fillStyle='#ffb13b';x.shadowColor='#ffb13b';x.shadowBlur=10;x.beginPath();x.moveTo(32,60);x.lineTo(10,24);x.lineTo(54,24);x.fill();}
const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(mk),transparent:true,depthTest:false}));marker.scale.setScalar(.45);marker.renderOrder=9;sceneR.add(marker);
const tmpM=new THREE.Matrix4(),tmpQ=new THREE.Quaternion(),tmpS=new THREE.Vector3(1,1,1);
function update(dt,t){
 if(modo==='sala'){let ix=0,iy=0;if(started&&!uiOpen){ix=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);iy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);}
  pl.mv=0;if(ix||iy){const fx=-Math.cos(camA),fz=-Math.sin(camA),rx=-fz,rz=fx;let vx=rx*ix-fx*iy,vy=rz*ix-fz*iy;const l=Math.hypot(vx,vy);vx=vx/l*3*dt;vy=vy/l*3*dt;
   if(!hit(pl.x+vx,pl.y))pl.x+=vx;if(!hit(pl.x,pl.y+vy))pl.y+=vy;pl.mv=1;pl.ph+=dt*9;yawT=Math.atan2(vx,vy);}
  let dy=yawT-yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));yaw+=dy*Math.min(1,dt*12);pjG.rotation.y=yaw;pjG.position.set(pl.x,0,pl.y);blob.position.set(pl.x,.03,pl.y);
  if(mixer){if(pl.mv){acao.timeScale=1.1;mixer.update(dt);}else{acao.time=.5417;mixer.update(0);}}
  camP.lerp(new THREE.Vector3(pl.x,0,pl.y),Math.min(1,dt*CAM.seguir));camA+=(camAT-camA)*Math.min(1,dt*8);const Rh=CAM.dist*1.414;camR.position.set(camP.x+Rh*Math.cos(camA),CAM.dist*CAM.elev,camP.z+Rh*Math.sin(camA));camR.lookAt(camP);
  const ox=Math.cos(camA),oz=Math.sin(camA);for(const w of WALLS){const g=(w.nx*ox+w.nz*oz>.15)?.12:1;w.s+=(g-w.s)*Math.min(1,dt*10);w.g.scale.y=w.s;}
  if(dockDrone)dockDrone.position.y=1.5+Math.sin(t*2)*.05;
  const nt=nextT();marker.visible=!!(nt&&!uiOpen&&started);if(marker.visible)marker.position.set(nt.x,2.5+Math.sin(t*3)*.12,nt.y);
  const tg=near(),pr=$('#prompt');if(tg&&!uiOpen&&started){pr.style.display='block';pr.innerHTML='<span class="key">E</span>'+tg.l;}else pr.style.display='none';
  lampada.intensity=34;
  if(Bo.on)bossUpdate(dt,t);
  {const d=Bo.on?'WASD mover · Espaço jogar página':'WASD mover · E interagir · Q/R girar · Z/X inclinar · C câmera padrão · roda: zoom · H ajuda';if(dicaEl.textContent!==d)dicaEl.textContent=d;}
  npcUpd(dt,t);
   }else{$('#prompt').style.display='none';
  if(F.on){fightUpdate(dt,t);return;}
  if(dr.go){const g=dr.go,k=Math.min(1,dt*1.6);dr.x+=(g.x-dr.x)*k;dr.y+=(g.y-dr.y)*k;dr.z+=(g.z-dr.z)*k;let dy=g.yaw-dr.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));dr.yaw+=dy*k;dr.pitch+=(g.pitch-dr.pitch)*k;if(Math.hypot(g.x-dr.x,g.z-dr.z,g.y-dr.y)<2){dr.go=null;if(g.h&&g.h.pos.distanceTo(camC.position)<=DRONE.alcance){toast('Chegou: '+g.h.nome+'.',2500);examinar(g.h);}}else if(keys.w||keys.a||keys.s||keys.d||keys.r||keys.f)dr.go=null;}
  if(!uiOpen&&!dr.go){const ix=(keys.d?1:0)-(keys.a?1:0),iy=(keys.w?1:0)-(keys.s?1:0),sp=26*dt;dr.yaw+=((keys.arrowleft?1:0)-(keys.arrowright?1:0))*1.6*dt;dr.pitch=Math.min(.6,Math.max(-1.5,dr.pitch+((keys.arrowup?1:0)-(keys.arrowdown?1:0))*1.2*dt));
   dr.x+=(-Math.sin(dr.yaw)*iy+Math.cos(dr.yaw)*ix)*sp;dr.z+=(-Math.cos(dr.yaw)*iy-Math.sin(dr.yaw)*ix)*sp;dr.y=Math.min(150,Math.max(2.5,dr.y+((keys.r?1:0)-(keys.f?1:0))*sp));}
  dr.x=Math.max(-170,Math.min(170,dr.x));dr.z=Math.max(-170,Math.min(170,dr.z));
  {const d='';if(dicaEl.textContent!==d)dicaEl.textContent=d;}
  camC.position.set(dr.x,dr.y,dr.z+Math.sin(t*1.3)*.15);const f=new THREE.Vector3(-Math.sin(dr.yaw)*Math.cos(dr.pitch),Math.sin(dr.pitch),-Math.cos(dr.yaw)*Math.cos(dr.pitch));camC.lookAt(camC.position.clone().add(f));
  const bus=sceneC.userData.bus;if(bus){const av=CIDADE.avenidas;for(let i=0;i<6;i++){const a=av[(i*3+2)%av.length],p=((t*(6+i)+i*37)%360)-180;const alongX=i%2===0;tmpQ.setFromAxisAngle(new THREE.Vector3(0,1,0),alongX?Math.PI/2:0);tmpM.compose(new THREE.Vector3(alongX?p:a+2,1.2,alongX?a+2:p),tmpQ,tmpS);bus.setMatrixAt(i,tmpM);}bus.instanceMatrix.needsUpdate=true;}
  {const bk=sceneC.userData.bike,q2=sceneC.userData.q2;if(bk){const z=((t*6)%320)-160;bk.position.set(-24,1.4,z);if(q2)q2.pos.set(-24,4,z);bk.visible=!!st.f2;}}
  $('#alt').textContent=Math.round(dr.y);const d=new Date(2031,2,14,3,12,0,0);d.setSeconds(Math.floor(t));$('#ts').textContent=d.toLocaleString('pt-BR');marcadores();}
}

/* ================= INICIALIZAÇÃO ================= */
resize();await montarSala();await jogador();await npcs();await montarCidade();
for(const h of hot){const bm=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,160,10,1,true),new THREE.MeshBasicMaterial({color:h.id==='fl'?0x888888:0x00ffe0,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));bm.position.set(h.pos.x,h.pos.y+80,h.pos.z);sceneC.add(bm);h.beam=bm;}

/* ===== conteúdo da Fase 2 ===== */
{for(const h of hot)h.f=1;
 const hub=new THREE.Group(),hm=new THREE.MeshStandardMaterial({color:0x2a3a50,emissive:0xffffff,emissiveMap:tex((x,w,h)=>{x.fillStyle='#050a12';x.fillRect(0,0,w,h);for(let c=0;c<16;c++){x.fillStyle=c%2?'#7fe8ff':'#ffd27a';x.fillRect(c*16+2,20,12,60);}},256,128),emissiveIntensity:1.3});
 const gb=new THREE.Mesh(new THREE.BoxGeometry(34,10,24),hm);gb.position.y=5;hub.add(gb);hub.position.set(108,0,-108);sceneC.add(hub);
 const hl=new THREE.PointLight(0x9ff,80,60,2);hl.position.set(108,14,-96);sceneC.add(hl);
 const bd=new THREE.Mesh(new THREE.PlaneGeometry(26,9),new THREE.MeshBasicMaterial({map:tex((x,w,h)=>{x.fillStyle='#0b1a2a';x.fillRect(0,0,w,h);x.strokeStyle='#00e5d8';x.lineWidth=4;x.strokeRect(6,6,w-12,h-12);x.fillStyle='#7dffea';x.font='bold 44px sans-serif';x.fillText('11.400 VAGAS ABERTAS',22,70);x.fillStyle='#cfe';x.font='20px sans-serif';x.fillText('exige comprovante de endereço no cadastro oficial',24,110);},512,150)}));bd.position.set(0,24,40);sceneC.add(bd);
 const bike=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,3.4),new THREE.MeshStandardMaterial({color:0x222222,emissive:0xffb13b,emissiveIntensity:1.6}));const bl=new THREE.PointLight(0xffb13b,25,14,2);bike.add(bl);sceneC.add(bike);sceneC.userData.bike=bike;
 const q2={id:'q2',pos:new THREE.Vector3(-24,4,0),nome:'Entregador'};
 hot.push({id:'q1',pos:new THREE.Vector3(108,8,-108),nome:'Centro de distribuição',f:2},q2,{id:'q3',pos:new THREE.Vector3(24,8,-20),nome:'Portão de serviço',f:2},{id:'q4',pos:new THREE.Vector3(0,24,40),nome:'Painel de vagas',f:2});q2.f=2;sceneC.userData.q2=q2;
 for(const h of hot)if(h.f===2){const bm=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,160,10,1,true),new THREE.MeshBasicMaterial({color:0xffb13b,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));bm.position.set(h.pos.x,h.pos.y+80,h.pos.z);bm.visible=false;sceneC.add(bm);h.beam=bm;}}

rp=new RenderPass(sceneR,camR);
composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4}));composer.addPass(rp);bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.6,.9);composer.addPass(bloom);composer.addPass(new OutputPass());resize();
upObj();
let last=0;function loop(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;update(dt,ts/1000);composer.render();requestAnimationFrame(loop);}requestAnimationFrame(loop);
$('#go').disabled=false;$('#go').textContent='COMEÇAR';
$('#go').onclick=()=>{started=true;$('#title').style.display='none';setTimeout(()=>A.ajuda(),300);};
window.DBG={npcU:npcUpd,NP,bu:bossUpdate,Bo,startBoss,fu:fightUpdate,keys,F,hit,TG,st,pl,dr,THREE,sceneR,sceneC,camC,camR,enter:entrarFeed,start:()=>$('#go').click(),hot};
})();
