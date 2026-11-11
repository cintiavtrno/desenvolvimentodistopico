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
const DRONE={x:-30,y:62,z:175,yaw:0,pitch:-.38,alcance:85};
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
const st={termo:0,painel:0,feed:0,call:0,p:{},fim:0,q:{},f2:0,pn2:0,feed2:0,fim2:0,pnl:{},fdl:{},fin:{},res:{},inf:0};
const FASE=()=>st.f5?5:st.f4?4:st.f3?3:st.f2?2:1;
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
function upObj(){$('#objin').innerHTML='<h4>'+(FT[FASE()])+'</h4>'+OB.map(o=>{const d=o[2](),n=!d&&o===OB.find(x=>!x[2]());const l=o[0]==='pistas'?(!st.f2&&st.p.p1&&st.p.p2&&st.p.p3&&nP()<6?'Falta: '+[!st.p.p4&&'Detalhar Moradia (painel)',!st.p.p5&&'Abrir laudos (painel)',!st.p.p6&&'atender a chamada (terminal)'].filter(Boolean).join(', ')+' ('+nP()+'/6)':'Reunir observações ('+(st.f2?nQ()+'/4':nP()+'/6')+')'):o[1];return `<div class="${d?'d':n?'n':''}">${d?'■':'□'} ${l}</div>`}).join('');}

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
function mulher(){const T=THREE;
const CFG = {
  colors: {
    skin: 0xa8714f, lips: 0x93454a, hair: 0x24150e, brow: 0x1a0f0a, iris: 0x4b2e19,
    top: 0x3f8a82, jeans: 0x2b3f66, belt: 0x2a1a12, buckle: 0xc9a24b,
    boot: 0x4f2d1b, sole: 0x1d1b1b, tie: 0xb8433f, gold: 0xd6b25a
  },
  // medidas em metros (mulher ~1,70 m)
  body: {
    thigh: 0.42, shin: 0.40, upperArm: 0.29, foreArm: 0.255,
    hipHalfWidth: 0.09, shoulderHalfWidth: 0.172, waistHeight: 0.17, shoulderHeight: 0.30,
    neckBase: 0.335, neckLength: 0.095, headCenter: 0.105, ankleHeight: 0.08
  },
  gait: {
    cycle: 0.98,        // segundos por ciclo completo (2 passos) na velocidade 1×
    stride: 1.05,       // metros percorridos por ciclo (determina a velocidade do piso)
    duty: 0.62,         // fração do ciclo com o pé apoiado no chão
    hipHeight: 0.862,   // altura média do quadril durante a caminhada
    bob: 0.016,         // oscilação vertical do quadril
    clearance: 0.085,   // altura máxima do pé na fase de balanço
    sway: 0.022,        // deslocamento lateral do quadril (transferência de peso)
    pelvisYaw: 0.12, pelvisRoll: 0.045, chestYaw: 0.07, lean: 0.07,
    armSwing: 0.38, toeOut: 0.10, footWidth: 0.095
  }
};
const B = CFG.body, G = CFG.gait, TAU = Math.PI * 2;

/* =====================================================================
   2. UTILITÁRIOS
   ===================================================================== */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const wrapPi = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

/** Loft: gera uma malha por seções elípticas.
 *  secs: [t, rx, rz, ox, oz] — t = posição no eixo; (rx,rz) = raios; (ox,oz) = deslocamento do centro.
 *  axis 'y': seções empilhadas em Y (rz é profundidade). axis 'z': seções ao longo de Z (rz vira altura em Y). */
function loft(secs, o = {}) {
  const seg = o.seg || 32, axis = o.axis || 'y';
  let s = secs.map(a => [a[0], a[1], a[2], a[3] || 0, a[4] || 0]);
  const sub = o.subdiv === undefined ? 4 : o.subdiv;           // suaviza o perfil (Catmull-Rom) para evitar silhuetas facetadas
  if (sub > 1 && s.length > 2) {
    const out = [], P = s, n0 = P.length;
    for (let i = 0; i < n0 - 1; i++) {
      const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, n0 - 1)];
      for (let k = 0; k < sub; k++) {
        const u = k / sub, u2 = u * u, u3 = u2 * u;
        out.push(p1.map((_, f) => 0.5 * ((2 * p1[f]) + (-p0[f] + p2[f]) * u + (2 * p0[f] - 5 * p1[f] + 4 * p2[f] - p3[f]) * u2 + (-p0[f] + 3 * p1[f] - 3 * p2[f] + p3[f]) * u3)));
      }
    }
    out.push(P[n0 - 1].slice()); s = out;
  }
  const dir = Math.sign(s[s.length - 1][0] - s[0][0]) || 1;
  if (o.roundA) { const f = s[0], c = o.roundA;
    s = [[f[0] - dir * c * 0.94, f[1] * .34, f[2] * .34, f[3], f[4]], [f[0] - dir * c * 0.57, f[1] * .82, f[2] * .82, f[3], f[4]], ...s]; }
  if (o.roundB) { const l = s[s.length - 1], c = o.roundB;
    s = [...s, [l[0] + dir * c * 0.57, l[1] * .82, l[2] * .82, l[3], l[4]], [l[0] + dir * c * 0.94, l[1] * .34, l[2] * .34, l[3], l[4]]]; }
  const n = s.length, pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const [t, rx, rz, ox, oz] = s[i];
    for (let j = 0; j < seg; j++) {
      const a = j / seg * TAU, x = ox + rx * Math.cos(a), w = oz + rz * Math.sin(a);
      if (axis === 'y') pos.push(x, t, w); else pos.push(x, w, t);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + j, d = (i + 1) * seg + (j + 1) % seg;
    if (axis === 'y') idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const addCap = (ring, first) => {
    const [t, , , ox, oz] = s[ring];
    const ci = pos.length / 3; if (axis === 'y') pos.push(ox, t, oz); else pos.push(ox, oz, t);
    for (let j = 0; j < seg; j++) {
      const p = ring * seg + j, q = ring * seg + (j + 1) % seg;
      const flip = (axis === 'y') ? !first : first;
      if (flip) idx.push(ci, q, p); else idx.push(ci, p, q);
    }
  };
  if (o.capA !== false) addCap(0, true);
  if (o.capB !== false) addCap(n - 1, false);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const grow = (prof, g) => prof.map(r => [r[0], r[1] + g, r[2] + g, r[3] || 0, r[4] || 0]);
const C = CFG.colors;
const std = (color, rough = 0.6, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: 0 }, extra));
const M = {
  skin: std(C.skin, 0.58), lips: std(C.lips, 0.4), hair: std(C.hair, 0.42, { metalness: 0.08, side: T.DoubleSide }),
  brow: std(C.brow, 0.7), eyeWhite: std(0xf2eee8, 0.25), iris: std(C.iris, 0.3), pupil: std(0x0a0707, 0.2),
  lash: std(0x120a07, 0.6), top: std(C.top, 0.85, { side: T.DoubleSide }), jeans: std(C.jeans, 0.92),
  belt: std(C.belt, 0.5), buckle: std(C.buckle, 0.3, { metalness: 0.8 }), boot: std(C.boot, 0.5), sole: std(C.sole, 0.8),
  tie: std(C.tie, 0.6), gold: std(C.gold, 0.25, { metalness: 0.9 })
};
const mk = (geo, mat, cast = true) => { const m = new T.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
const ell = (r, sx, sy, sz, mat, x = 0, y = 0, z = 0, cast = false) => {
  const m = mk(new T.SphereGeometry(r, 24, 16), mat, cast); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m;
};
const bone = (name, parent, x = 0, y = 0, z = 0) => { const b = new T.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); return b; };

const root = new T.Group(); root.name = 'armature'; 
const pelvis = bone('pelvis', root, 0, G.hipHeight, 0);
const spine = bone('spine', pelvis, 0, B.waistHeight, 0);
const neck = bone('neck', spine, 0, B.neckBase, 0);
const head = bone('head', neck, 0, B.neckLength, 0);

/* ---- Pélvis e quadril (jeans) ---- */
{
  const prof = [[-0.13, .06, .062, 0, -.004], [-0.095, .115, .084, 0, -.006], [-0.05, .155, .105, 0, -.013], [-0.01, .172, .112, 0, -.015], [0.06, .156, .104, 0, -.012], [0.12, .136, .093, 0, -.006], [0.17, .128, .087]];
  pelvis.add(mk(loft(grow(prof, 0.006), { roundA: 0.02, roundB: 0.01 }), M.jeans));
  const belt = mk(loft([[0.148, .134, .093], [0.168, .1325, .0915]].map(r => [r[0], r[1] + .011, r[2] + .011]), { capA: false, capB: false }), M.belt);
  pelvis.add(belt);
  const buckle = mk(new T.BoxGeometry(0.035, 0.026, 0.008), M.buckle, false); buckle.position.set(0, 0.158, 0.1); pelvis.add(buckle);
}

/* ---- Pernas ---- */
const legs = [];
const thighProf = [[0, .084, .086, 0, -.004], [-.06, .083, .086], [-.14, .079, .081], [-.24, .070, .072], [-.33, .061, .063], [-.42, .054, .056]];
const shinProf = [[0, .052, .054], [-.07, .054, .058, 0, -.006], [-.13, .053, .058, 0, -.009], [-.22, .045, .047, 0, -.005], [-.31, .038, .040], [-.40, .034, .036]];
const upperBoot = [[-.058, .034, .040, 0, -.034], [-.04, .040, .044, 0, -.031], [0, .045, .046, 0, -.028], [.06, .047, .040, 0, -.034], [.12, .041, .030, 0, -.044], [.16, .029, .022, 0, -.052]];
const soleProf = [[-.062, .036, .010], [0, .048, .010], [.06, .050, .010], [.12, .045, .010], [.168, .030, .009]];
const shaftProf = [[-.05, .045, .050, 0, -.004], [0, .043, .047, 0, -.003], [.07, .046, .049, 0, -.004], [.09, .048, .051, 0, -.004]];

function buildFoot(ankle) {
  const foot = new T.Group(); ankle.add(foot);
  foot.add(mk(loft(upperBoot, { axis: 'z', roundA: 0.02, roundB: 0.03 }), M.boot));
  const sole = mk(loft(soleProf.map(r => [r[0], r[1], r[2], 0, -0.071]), { axis: 'z', roundA: 0.01, roundB: 0.02 }), M.sole); foot.add(sole);
  foot.add(mk(loft(shaftProf, { roundA: 0.0, capA: true }), M.boot));
  // cadarço / língua
  const tongue = mk(new T.BoxGeometry(0.05, 0.012, 0.075), M.boot, false); tongue.position.set(0, -0.003, 0.055); tongue.rotation.x = -0.35; foot.add(tongue);
  return foot;
}
function buildLeg(side) {
  const tag = side > 0 ? 'L' : 'R';
  const hip = bone('hip' + tag, pelvis, side * B.hipHalfWidth, 0, 0);
  const knee = bone('knee' + tag, hip, 0, -B.thigh, 0);
  const ankle = bone('ankle' + tag, knee, 0, -B.shin, 0);
  hip.add(mk(loft(grow(thighProf, .006), { roundA: .03, roundB: .02 }), M.jeans));
  knee.add(mk(loft(grow(shinProf, .006), { roundA: .02, roundB: .02 }), M.jeans));
  buildFoot(ankle);
  const leg = { side, hip, knee, ankle }; legs.push(leg); return leg;
}
buildLeg(1); buildLeg(-1);

/* ---- Tronco (pele + camiseta) ---- */
const torso = new T.Group(); spine.add(torso);
{
  const skin = [[-.03, .122, .082], [.06, .13, .09], [.13, .14, .098], [.2, .15, .108, 0, .008], [.27, .158, .1], [.31, .152, .088], [.335, .13, .075], [.36, .085, .068], [.385, .056, .056]];
  torso.add(mk(loft(skin, { roundA: .02, roundB: .01 }), M.skin));
  const tee = [[-.03, .128, .088], [.06, .137, .097], [.13, .147, .105], [.2, .157, .116, 0, .008], [.27, .165, .107], [.31, .159, .095], [.335, .137, .082], [.35, .112, .080], [.358, .097, .077]];
  torso.add(mk(loft(tee, { capA: false, capB: false }), M.top));
  [-1, 1].forEach(s => torso.add(ell(0.055, 1, 0.9, 0.55, M.top, s * 0.056, 0.2, 0.087, true)));
}
const neckMesh = mk(loft([[0, .05, .052], [.05, .047, .05], [.1, .045, .048, 0, .004]], { roundB: .01 }), M.skin); neck.add(neckMesh);

/* ---- Braços e mãos ---- */
const arms = [];
const upperArmProf = [[0, .047, .049], [-.07, .046, .049], [-.17, .039, .042], [-.23, .035, .037], [-.29, .032, .034]];
const foreArmProf = [[0, .032, .034], [-.06, .034, .036], [-.14, .029, .030], [-.21, .024, .025], [-.255, .022, .023]];
const sleeveProf = [[0, .054, .056], [-.06, .054, .057], [-.115, .053, .056]];
const palmProf = [[0, .017, .027], [-.02, .0185, .036], [-.055, .0175, .040], [-.088, .015, .037]];
const fingerLen = [[.040, .026, .021, .0092], [.044, .029, .023, .0090], [.041, .027, .021, .0085], [.032, .020, .018, .0078]];
const fingerZ = [.0275, .0095, -.0085, -.026];
const fingerCurl = [.16, .22, .28, .34];

function finger(parent, side, z, lens, r, curl) {
  const b1 = bone('f1', parent, 0, -0.088, z), b2 = bone('f2', b1, 0, -lens[0], 0), b3 = bone('f3', b2, 0, -lens[1], 0);
  const seg = (b, l, r0, r1) => b.add(mk(loft([[0, r0, r0], [-l, r1, r1]], { seg: 12, roundA: 0.008, roundB: 0.009 }), M.skin, false));
  seg(b1, lens[0], r, r * .88); seg(b2, lens[1], r * .88, r * .8); seg(b3, lens[2], r * .8, r * .66);
  b1.rotation.z = -side * curl; b2.rotation.z = -side * curl * 1.25; b3.rotation.z = -side * curl * 0.9;
  b1.rotation.x = -(z) * 1.2;  // leve abertura dos dedos
}
function buildHand(wrist, side) {
  wrist.add(mk(loft(palmProf.map(r => [r[0], r[1], r[2], 0, 0.002]), { seg: 24, roundA: .015, roundB: .012 }), M.skin, false));
  for (let i = 0; i < 4; i++) finger(wrist, side, fingerZ[i], fingerLen[i].slice(0, 3), fingerLen[i][3], fingerCurl[i]);
  // polegar
  const t1 = bone('th1', wrist, 0, -0.03, 0.03), t2 = bone('th2', t1, 0, -0.038, 0);
  t1.rotation.set(-0.72, 0, -side * 0.28); t2.rotation.set(-0.22, 0, -side * 0.12);
  t1.add(mk(loft([[0, .0115, .0115], [-.038, .0098, .0098]], { seg: 12, roundA: .01, roundB: .008 }), M.skin, false));
  t2.add(mk(loft([[0, .0098, .0098], [-.032, .0082, .0082]], { seg: 12, roundA: .008, roundB: .01 }), M.skin, false));
}
function buildArm(side) {
  const tag = side > 0 ? 'L' : 'R';
  const shoulder = bone('shoulder' + tag, spine, side * B.shoulderHalfWidth, B.shoulderHeight, 0);
  const elbow = bone('elbow' + tag, shoulder, 0, -B.upperArm, 0);
  const wrist = bone('wrist' + tag, elbow, 0, -B.foreArm, 0);
  shoulder.add(mk(loft(upperArmProf, { roundB: .01 }), M.skin));
  shoulder.add(mk(loft(sleeveProf, { capB: false, roundA: .02 }), M.top));
  elbow.add(mk(loft(foreArmProf, { roundA: .01, roundB: .012 }), M.skin));
  buildHand(wrist, side);
  const arm = { side, shoulder, elbow, wrist }; arms.push(arm); return arm;
}
buildArm(1); buildArm(-1);

/* ---- Cabeça, rosto e cabelo ---- */
const HEAD = [[-.115, .022, .030, 0, .050], [-.100, .042, .053, 0, .043], [-.075, .061, .076, 0, .025], [-.040, .073, .090, 0, .008], [0, .075, .096, 0, 0],
  [.040, .077, .098, 0, -.001], [.075, .073, .094, 0, -.002], [.100, .060, .080, 0, -.003], [.116, .038, .052, 0, -.003], [.124, .015, .020, 0, -.003]];
function headAt(y) {
  const P = HEAD; if (y <= P[0][0]) return { rx: P[0][1], rz: P[0][2], oz: P[0][4] };
  for (let i = 0; i < P.length - 1; i++) if (y <= P[i + 1][0]) {
    const u = (y - P[i][0]) / (P[i + 1][0] - P[i][0]);
    return { rx: lerp(P[i][1], P[i + 1][1], u), rz: lerp(P[i][2], P[i + 1][2], u), oz: lerp(P[i][4], P[i + 1][4], u) };
  }
  const l = P[P.length - 1]; return { rx: l[1], rz: l[2], oz: l[4] };
}
const faceZ = (x, y) => { const h = headAt(y); return h.oz + h.rz * Math.sqrt(Math.max(0, 1 - (x / h.rx) ** 2)); };

const face = new T.Group(); face.position.y = B.headCenter; head.add(face);
face.add(mk(loft(HEAD, { seg: 40 }), M.skin));
const lids = [], LID_OPEN = -0.16;
{
  // olhos
  for (const s of [-1, 1]) {
    const eye = new T.Group(); eye.position.set(s * 0.033, 0.010, faceZ(0.033, 0.010) - 0.0115); face.add(eye);
    eye.add(ell(0.0148, 1, 1, 1, M.eyeWhite));
    eye.add(ell(0.0090, 1, 1, 0.45, M.iris, 0, 0, 0.0116));
    eye.add(ell(0.0044, 1, 1, 0.4, M.pupil, 0, 0, 0.0141));
    const lid = new T.Group(); lid.rotation.x = LID_OPEN; eye.add(lid);
    lid.add(mk(new T.SphereGeometry(0.0157, 20, 10, 0, TAU, 0, 1.3), M.skin, false)); lids.push(lid);
    // cílios (linha escura na borda da pálpebra)
    const pts = []; for (let i = 0; i <= 8; i++) { const x = lerp(-0.0145, 0.0145, i / 8), y = 0.0046 + 0.0012 * Math.sin(i / 8 * Math.PI); pts.push(new T.Vector3(x + s * 0.0012 * (i / 8), y, Math.sqrt(Math.max(0, 0.0157 ** 2 - x * x - y * y)) + 0.0002)); }
    lid.add(mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, 0.0016, 5), M.lash, false));
    // sobrancelhas
    const bp = []; for (let i = 0; i <= 8; i++) { const u = i / 8, x = lerp(0.010, 0.056, u), y = 0.043 + 0.008 * Math.sin(Math.PI * u * 0.9) - 0.005 * u; bp.push(new T.Vector3(s * x, y, faceZ(x, y) - 0.0006)); }
    face.add(mk(new T.TubeGeometry(new T.CatmullRomCurve3(bp), 20, 0.0019, 6), M.brow, false));
    // maçãs do rosto, orelhas, brincos
    const ear = ell(0.012, 0.62, 2.3, 1.45, M.skin, s * 0.0765, -0.010, -0.006); ear.rotation.y = s * 0.28; face.add(ear);
    face.add(ell(0.0065, 1, 1.15, 1, M.gold, s * 0.0765, -0.038, -0.005));
  }
  // nariz
  face.add(ell(0.0105, 0.85, 1.45, 0.95, M.skin, 0, -0.012, faceZ(0, -0.012) - 0.003));
  face.add(ell(0.0085, 1, 0.9, 1, M.skin, 0, -0.029, faceZ(0, -0.029) + 0.0005));
  for (const s of [-1, 1]) face.add(ell(0.0052, 1, 0.85, 1, M.skin, s * 0.0085, -0.030, faceZ(0.0085, -0.030) - 0.002));
  // boca
  face.add(ell(1, 0.0155, 0.0012, 0.004, M.pupil, 0, -0.0675, faceZ(0, -0.0675) - 0.0004));
  face.add(ell(1, 0.0175, 0.0062, 0.0082, M.lips, 0, -0.0625, faceZ(0, -0.0625) - 0.0035));
  face.add(ell(1, 0.0165, 0.0078, 0.0092, M.lips, 0, -0.0725, faceZ(0, -0.0725) - 0.0040));
}
// cabelo: calota + laterais + nuca, orelhas livres, rabo de cavalo articulado
const hairParts = new T.Group(); face.add(hairParts);
{
  const mkHair = (tS, tL, pS, pL) => { const m = mk(new T.SphereGeometry(1, 48, 24, pS, pL, tS, tL), M.hair); m.scale.set(0.088, 0.138, 0.118); m.position.set(0, 0.004, -0.006); hairParts.add(m); };
  mkHair(0, 0.92, 0, TAU);                                         // coroa
  mkHair(0.88, 0.32, Math.PI / 2 + 0.85, TAU - 1.7);              // laterais (deixa a testa e a orelha livres)
  mkHair(1.24, 0.66, 1.5 * Math.PI - 1.0, 2.0);                    // nuca
}
const ptail = [];
{
  const base = bone('ponytail0', head, 0, B.headCenter + 0.064, -0.114);
  const p1 = bone('ponytail1', base, 0, -0.10, 0), p2 = bone('ponytail2', p1, 0, -0.10, 0);
  const seg = (b, l, r0, r1) => b.add(mk(loft([[0, r0, r0 * 0.9], [-l * 0.5, (r0 + r1) / 2 * 1.08, (r0 + r1) / 2 * 0.95], [-l, r1, r1 * 0.9]], { seg: 20, roundB: r1 > 0.012 ? 0.012 : 0.03 }), M.hair));
  seg(base, 0.10, 0.026, 0.032); seg(p1, 0.10, 0.032, 0.030); seg(p2, 0.13, 0.030, 0.006);
  const tie = mk(new T.TorusGeometry(0.0255, 0.0075, 8, 24).rotateX(Math.PI / 2), M.tie, false); tie.position.y = -0.006; base.add(tie);
  ptail.push(base, p1, p2);
}

/* ---- Coleta de materiais/malhas para recursos de visualização ---- */

const DOWN = new T.Vector3(0, -1, 0), FWD = new T.Vector3(0, 0, 1);
const pelvisInv = new T.Matrix4();

/** Posição/pitch do tornozelo no espaço da raiz, para a fase p∈[0,1) de uma perna. */
let AMP=1;
function footTarget(p) {
  const ds = G.duty, D = G.stride * ds;
  let z, lift = 0, pitch;
  if (p < ds) {                                   // apoio: pé fixo no chão, corpo avança
    const u = p / ds; z = D / 2 - D * u;
    pitch = u < 0.15 ? lerp(0.30, 0, 1 - Math.pow(1 - u / 0.15, 2)) : u < 0.68 ? 0 : -0.62 * smooth((u - 0.68) / 0.32);
  } else {                                        // balanço: curva de Hermite com velocidade contínua
    const v = (p - ds) / (1 - ds), m = -G.stride * (1 - ds);
    z = (2 * v ** 3 - 3 * v * v + 1) * (-D / 2) + (v ** 3 - 2 * v * v + v) * m + (-2 * v ** 3 + 3 * v * v) * (D / 2) + (v ** 3 - v * v) * m;
    lift = G.clearance * Math.pow(Math.sin(Math.PI * v), 1.15);
    pitch = v < 0.35 ? lerp(-0.62, 0, smooth(v / 0.35)) : lerp(0, 0.30, smooth((v - 0.35) / 0.65));
  }
  const heel = pitch > 0 ? 0.07 * Math.sin(pitch) : 0.13 * Math.sin(-pitch);   // calcanhar/ponta apoiados
  return { z: z * AMP, y: B.ankleHeight + (lift + heel) * AMP, pitch: pitch * AMP };
}

function solveLeg(leg, tx, ty, tz, pitch) {
  const a = B.thigh, b = B.shin;
  const d = new T.Vector3(tx, ty, tz).applyMatrix4(pelvisInv).sub(leg.hip.position);
  const dist = clamp(d.length(), Math.abs(a - b) + 0.01, a + b - 0.002);
  d.setLength(dist);
  const dir = d.clone().normalize();
  const alpha = Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1));
  const n = new T.Vector3().crossVectors(dir, FWD).normalize();           // eixo de flexão do joelho (joelho para a frente)
  const tdir = dir.clone().applyAxisAngle(n, alpha);
  const qThigh = new T.Quaternion().setFromUnitVectors(DOWN, tdir);
  const sdir = d.clone().sub(tdir.clone().multiplyScalar(a)).normalize();
  const qKnee = new T.Quaternion().setFromUnitVectors(DOWN, sdir.applyQuaternion(qThigh.clone().invert()));
  leg.hip.quaternion.copy(qThigh); leg.knee.quaternion.copy(qKnee);
  const qShin = qThigh.clone().multiply(qKnee);
  const qFootRoot = new T.Quaternion().setFromEuler(new T.Euler(pitch, leg.side * G.toeOut, 0, 'YXZ'));
  const qFootPelvis = pelvis.quaternion.clone().invert().multiply(qFootRoot);
  leg.ankle.quaternion.copy(qShin.invert().multiply(qFootPelvis));
}

function applyPose(p, t) {
  const pl = p, pr = (p + 0.5) % 1;
  const c1 = Math.cos(TAU * pl), swayS = Math.sin(TAU * (pl - 0.05));
  // quadril: sobe/desce 2× por ciclo, desloca para a perna de apoio, gira e inclina
  pelvis.position.set(G.sway * swayS * AMP, G.hipHeight + G.bob * Math.cos(2 * TAU * (pl - 0.25)) * AMP, 0);
  const roll = G.pelvisRoll * swayS * AMP;
  pelvis.rotation.set(G.lean * 0.5 + 0.008 * Math.cos(2 * TAU * pl), -G.pelvisYaw * c1 * AMP, roll, 'YXZ');
  pelvis.updateMatrix(); pelvisInv.copy(pelvis.matrix).invert();

  for (const leg of legs) {
    const f = footTarget(leg.side > 0 ? pl : pr);
    solveLeg(leg, leg.side * G.footWidth, f.y, f.z, f.pitch);
  }
  // tronco contra-rotaciona em relação ao quadril; respiração sutil
  spine.rotation.set(G.lean * 0.5, (G.chestYaw + G.pelvisYaw) * c1 * AMP, -0.6 * roll, 'YXZ');
  const br = Math.sin(t * 1.9);
  torso.scale.set(1 + 0.004 * br, 1, 1 + 0.008 * br);
  // pescoço e cabeça estabilizam o olhar
  neck.rotation.set(-0.02, 0, 0);
  head.rotation.set(-G.lean * 0.8 + 0.012 * Math.cos(2 * TAU * pl), 0.04 * Math.sin(TAU * 0.23 * t) - 0.9 * G.chestYaw * c1, -0.4 * roll, 'YXZ');
  // braços em oposição às pernas, cotovelos flexionados
  for (const arm of arms) {
    const pa = arm.side > 0 ? pl : pr, ca = Math.cos(TAU * pa);
    arm.shoulder.rotation.set(G.armSwing * ca * AMP, 0, arm.side * 0.09);
    arm.elbow.rotation.set(-(0.30 - 0.20 * ca), 0, 0);
    arm.wrist.rotation.set(-0.08, 0, arm.side * 0.04);
  }
  // rabo de cavalo: movimento secundário atrasado em cada segmento
  ptail[0].rotation.set(0.85 + 0.10 * Math.sin(2 * TAU * pl - 0.6), 0, 0.08 * Math.sin(TAU * pl - 0.4));
  ptail[1].rotation.set(-0.35 + 0.16 * Math.sin(2 * TAU * pl - 1.2), 0, 0.10 * Math.sin(TAU * pl - 0.9));
  ptail[2].rotation.set(-0.35 + 0.20 * Math.sin(2 * TAU * pl - 1.9), 0, 0.12 * Math.sin(TAU * pl - 1.4));
  // piscar
  const bt = t % 3.8, bl = bt < 0.16 ? Math.sin(Math.PI * bt / 0.16) : 0;
  for (const l of lids) l.rotation.x = LID_OPEN + 1.36 * bl;
}
return {root,step:(p,t,a)=>{AMP=a;applyPose(p,t);},H:1.7};}
function robocao(){const T=THREE;
const PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (id) => document.getElementById(id);
/*  Materiais                                                          */
/* ------------------------------------------------------------------ */
let ACC = 0x2fe6ff;
const M = {
  shell: new T.MeshPhysicalMaterial({ color: 0xe6e3dc, metalness: 0.12, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12 }),
  graphite: new T.MeshStandardMaterial({ color: 0x2c2f36, metalness: 0.8, roughness: 0.4 }),
  alu: new T.MeshStandardMaterial({ color: 0xaeb3bb, metalness: 1, roughness: 0.3, envMapIntensity: 0.8 }),
  dark: new T.MeshStandardMaterial({ color: 0x17181c, metalness: 0.6, roughness: 0.5 }),
  rubber: new T.MeshStandardMaterial({ color: 0x151517, metalness: 0, roughness: 0.85 }),
  glass: new T.MeshPhysicalMaterial({ color: 0x07090c, metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 }),
  orange: new T.MeshStandardMaterial({ color: 0xe8731c, metalness: 0.1, roughness: 0.5, side: T.DoubleSide }),
  cable: new T.MeshStandardMaterial({ color: 0x23262c, metalness: 0.2, roughness: 0.55, side: T.DoubleSide }),
  led: new T.MeshBasicMaterial({ color: ACC }),
  eye: new T.MeshBasicMaterial({ color: ACC }),
  white: new T.MeshBasicMaterial({ color: 0xffffff })
};

/* halo (brilho aditivo) */
const haloTex = (function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(cv);
})();
const halos = [];
function halo(parent, x, y, z, size, op) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: haloTex, color: ACC, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: op == null ? 0.7 : op }));
  s.position.set(x, y, z); s.scale.set(size, size, 1);
  parent.add(s); halos.push(s); return s;
}

/* ------------------------------------------------------------------ */
/*  Helpers de geometria                                               */
/* ------------------------------------------------------------------ */
const sphereGeo = new T.SphereGeometry(1, 36, 22);
const screwGeo = new T.CylinderGeometry(0.0048, 0.0048, 0.004, 6);
const unitCyl = new T.CylinderGeometry(1, 1, 1, 14, 1); unitCyl.translate(0, 0.5, 0);

function mesh(geo, mat, parent, x, y, z) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0);
  if (parent) parent.add(m);
  return m;
}
function ell(parent, rx, ry, rz, mat, x, y, z) {
  const m = mesh(sphereGeo, mat, parent, x, y, z);
  m.scale.set(rx, ry, rz);
  return m;
}
/* capsula afilada ao longo de -Y (topo em y=0) */
function taperedGeo(r1, r2, len) {
  const pts = [], N = 8;
  for (let i = 0; i <= N; i++) { const a = (i / N) * PI / 2; pts.push(new T.Vector2(r1 * Math.sin(a), r1 * Math.cos(a))); }
  for (let i = 0; i <= N; i++) { const b = (i / N) * PI / 2; pts.push(new T.Vector2(r2 * Math.cos(b), -len - r2 * Math.sin(b))); }
  pts.reverse();
  return new T.LatheGeometry(pts, 28);
}
function limb(parent, r1, r2, len, mat, x, y, z) { return mesh(taperedGeo(r1, r2, len), mat, parent, x, y, z); }
function torus(parent, R, r, mat, x, y, z, rx, ry) {
  const m = mesh(new T.TorusGeometry(R, r, 10, 32), mat, parent, x, y, z);
  m.rotation.x = rx || 0; m.rotation.y = ry || 0; return m;
}
function disc(parent, r, h, mat, x, y, z) { /* eixo em Z */
  const m = mesh(new T.CylinderGeometry(r, r, h, 36), mat, parent, x, y, z);
  m.rotation.x = PI / 2; return m;
}
function screws(parent, R, n, z, a0) {
  for (let i = 0; i < n; i++) {
    const a = (a0 || 0) + (i / n) * PI * 2;
    const s = mesh(screwGeo, M.alu, parent, Math.cos(a) * R, Math.sin(a) * R, z);
    s.rotation.x = PI / 2;
  }
}
/* faixa de placa sobre elipsoide (com casca interna escura = espessura) */
function band(parent, rx, ry, rz, t0, t1, center, arc, mat, x, y, z) {
  const phi0 = (center === 'top' ? PI : 0) - arc / 2;
  const g = new T.SphereGeometry(1, 48, 22, phi0, arc, t0, t1 - t0);
  g.rotateZ(PI / 2);
  const o = new T.Mesh(g, mat); o.scale.set(rx, ry, rz); o.position.set(x || 0, y || 0, z || 0);
  const i = new T.Mesh(g, M.dark); i.scale.set(rx * 0.95, ry * 0.95, rz * 0.95); i.position.copy(o.position);
  parent.add(i, o);
  return o;
}
/* ponto sobre elipsoide numa direcao */
function onEll(c, r, d) {
  const l = Math.hypot(d[0], d[1], d[2]);
  const v = new T.Vector3(d[0] / l, d[1] / l, d[2] / l);
  const p = new T.Vector3(c[0] + r[0] * v.x, c[1] + r[1] * v.y, c[2] + r[2] * v.z);
  const n = new T.Vector3(v.x / r[0], v.y / r[1], v.z / r[2]).normalize();
  return { p, n };
}

/* cabo flexivel (tubo que se atualiza a cada quadro) */
function makeCable(parent, radius, tub, rad, mat) {
  const n = (tub + 1) * (rad + 1);
  const pos = new Float32Array(n * 3);
  const idx = [];
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = (i + 1) * (rad + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new T.Mesh(g, mat);
  m.frustumCulled = false; m.castShadow = false;
  const tt = new T.Vector3(), bb = new T.Vector3(), nn = new T.Vector3(), Z = new T.Vector3(0, 0, 1);
  m.setPoints = function (pts) {
    const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    let k = 0;
    for (let i = 0; i <= tub; i++) {
      const u = i / tub;
      const p = curve.getPoint(u);
      curve.getTangent(u, tt);
      bb.crossVectors(tt, Z);
      if (bb.lengthSq() < 1e-6) bb.set(1, 0, 0);
      bb.normalize();
      nn.crossVectors(bb, tt).normalize();
      for (let j = 0; j <= rad; j++) {
        const a = (j / rad) * PI * 2, c = Math.cos(a) * radius, s = Math.sin(a) * radius;
        pos[k++] = p.x + bb.x * c + nn.x * s;
        pos[k++] = p.y + bb.y * c + nn.y * s;
        pos[k++] = p.z + bb.z * c + nn.z * s;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
  };
  parent.add(m);
  return m;
}
function aim(m, p0, p1, rad) {
  m.position.copy(p0);
  const d = new T.Vector3().subVectors(p1, p0);
  const L = d.length();
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.multiplyScalar(1 / (L || 1)));
  m.scale.set(rad, L, rad);
}

/* ------------------------------------------------------------------ */
/*  Modelo                                                             */
/* ------------------------------------------------------------------ */
const dog = new T.Group();

const torso = new T.Group(); dog.add(torso);
const chestG = new T.Group(); chestG.position.set(0.17, 0, 0); torso.add(chestG);
const pelvisG = new T.Group(); pelvisG.position.set(-0.18, 0, 0); torso.add(pelvisG);

/* --- peito --- */
const chestCore = ell(chestG, 0.158, 0.108, 0.1, M.graphite);
[[0.12, 0.95, 1.0], [1.0, 1.9, 1.012], [1.95, 2.9, 1.0]].forEach((b) =>
  band(chestG, 0.163, 0.117 * b[2], 0.109, b[0], b[1], 'top', 4.0, M.shell, 0, 0.002, 0));
[[0.3, 1.6], [1.65, 2.85]].forEach((b) =>
  band(chestG, 0.162, 0.113, 0.106, b[0], b[1], 'bottom', 1.6, M.alu, 0, 0, 0));
/* reator no peito */
const reactor = new T.Group(); reactor.position.set(0.138, -0.015, 0); reactor.rotation.y = PI / 2; chestG.add(reactor);
ell(reactor, 0.05, 0.05, 0.02, M.dark, 0, 0, -0.012);
torus(reactor, 0.034, 0.005, M.alu, 0, 0, 0.0);
const reactorCore = mesh(new T.CircleGeometry(0.024, 32), M.led, reactor, 0, 0, 0.011);
halo(reactor, 0, 0, 0.03, 0.055, 0.5);
/* trilho dorsal + sensor lidar */
const rail = ell(chestG, 0.09, 0.008, 0.016, M.dark, -0.01, 0.123, 0);
ell(chestG, 0.07, 0.003, 0.006, M.led, -0.01, 0.131, 0);
/* base do pescoco */
ell(chestG, 0.075, 0.06, 0.085, M.shell, 0.1, 0.07, 0);

/* --- pelve --- */
ell(pelvisG, 0.135, 0.105, 0.095, M.graphite);
[[0.15, 1.1, 1.0], [1.15, 2.1, 1.012], [2.15, 2.9, 1.0]].forEach((b) =>
  band(pelvisG, 0.14, 0.113 * b[2], 0.103, b[0], b[1], 'top', 4.0, M.shell, 0, 0.002, 0));
band(pelvisG, 0.139, 0.11, 0.1, 0.35, 2.6, 'bottom', 1.6, M.alu, 0, 0, 0);
/* lidar */
const lidar = new T.Group(); lidar.position.set(-0.17, 0.118, 0); torso.add(lidar);
ell(lidar, 0.03, 0.014, 0.03, M.graphite, 0, 0, 0);
const lidarTop = new T.Group(); lidar.add(lidarTop);
ell(lidarTop, 0.022, 0.012, 0.022, M.glass, 0, 0.012, 0);
torus(lidarTop, 0.022, 0.003, M.led, 0, 0.012, 0, PI / 2, 0);
mesh(new T.BoxGeometry(0.008, 0.006, 0.014), M.alu, lidarTop, 0.02, 0.014, 0);

/* --- coluna / fole --- */
(function () {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const y = -0.11 + (i / 60) * 0.22;
    const edge = smooth(0, 0.18, 1 - Math.abs(y) / 0.11);
    const r = 0.07 + 0.011 * Math.cos(y * 150) * 1 + 0.0;
    pts.push(new T.Vector2(r * (0.35 + 0.65 * edge) + 0.0, y));
  }
  const g = new T.LatheGeometry(pts, 36);
  g.rotateZ(-PI / 2);
  const m = new T.Mesh(g, M.rubber); m.position.set(-0.012, -0.004, 0); m.scale.set(1, 1.04, 0.93);
  torso.add(m);
  const inner = ell(torso, 0.15, 0.052, 0.052, M.graphite, -0.012, 0, 0);
})();
/* colunas laterais */
[-1, 1].forEach((s) => {
  const r = mesh(new T.CylinderGeometry(0.006, 0.006, 0.19, 8), M.alu, torso, -0.012, -0.045, s * 0.056);
  r.rotation.z = PI / 2;
});

/* --- pernas --- */
const L3 = 0.085, PAD = 0.025, LEGZ = 0.118;
const legs = [];
function buildLeg(parent, side, front, off, x0) {
  const L1 = front ? 0.165 : 0.178, L2 = front ? 0.17 : 0.178;
  const leg = { side, front, off, x0, L1, L2, parent, bend: front ? -1 : 1, inSwing: false, name: (front ? 'D' : 'T') + (side > 0 ? 'E' : 'D') };
  const root = new T.Group();
  root.position.set(front ? 0.03 : -0.02, -0.042, side * LEGZ);
  parent.add(root); leg.root = root;
  /* carcaca da articulacao */
  ell(root, 0.046, 0.046, 0.046, M.graphite, 0, 0, -side * 0.014);
  disc(root, 0.04, 0.014, M.alu, 0, 0, side * 0.03);
  torus(root, 0.027, 0.0035, M.led, 0, 0, side * 0.039);
  disc(root, 0.02, 0.01, M.dark, 0, 0, side * 0.037);
  screws(root, 0.034, 6, side * 0.038, 0.3);
  /* placa de ombro/quadril */
  const sp = ell(root, front ? 0.066 : 0.07, front ? 0.058 : 0.064, 0.02, M.shell, front ? -0.008 : -0.005, 0.034, side * 0.015);
  sp.rotation.z = front ? -0.25 : 0.2;

  const up = new T.Group(); root.add(up); leg.up = up;
  const kn = new T.Group(); kn.position.set(0, -L1, 0); up.add(kn); leg.kn = kn;
  const an = new T.Group(); an.position.set(0, -L2, 0); kn.add(an); leg.an = an;
  const pw = new T.Group(); pw.position.set(0, -L3, 0); an.add(pw); leg.pw = pw;

  /* segmento superior */
  const r1 = front ? 0.034 : 0.044;
  limb(up, r1, 0.025, L1, M.shell, 0, -0.004, 0);
  limb(up, 0.016, 0.012, L1 - 0.01, M.alu, 0, -0.01, -side * 0.012);
  [0.3, 0.62].forEach((t) => torus(up, lerp(r1, 0.025, t) + 0.0035, 0.004, M.graphite, 0, -L1 * t, 0, PI / 2, 0));
  /* articulacao do joelho / cotovelo */
  ell(kn, 0.03, 0.03, 0.03, M.graphite, 0, 0, 0);
  disc(kn, 0.023, 0.009, M.alu, 0, 0, side * 0.026);
  torus(kn, 0.0145, 0.003, M.led, 0, 0, side * 0.031);
  screws(kn, 0.019, 5, side * 0.031, 0.5);
  /* segmento inferior */
  limb(kn, 0.022, 0.015, L2, M.alu, 0, -0.002, 0);
  [0.25, 0.45, 0.65].forEach((t) => torus(kn, lerp(0.022, 0.015, t) + 0.002, 0.0028, M.graphite, 0, -L2 * t, 0, PI / 2, 0));
  const plate = ell(kn, 0.017, L2 * 0.4, 0.012, M.shell, 0, -L2 * 0.5, side * 0.02);
  /* tornozelo */
  ell(an, 0.019, 0.019, 0.019, M.graphite, 0, 0, 0);
  disc(an, 0.012, 0.008, M.alu, 0, 0, side * 0.018);
  /* pastern + mola */
  limb(an, 0.0105, 0.0085, L3, M.alu, 0, 0, 0);
  const hp = [];
  for (let i = 0; i <= 70; i++) {
    const t = i / 70, a = t * PI * 2 * 6;
    hp.push(new T.Vector3(Math.cos(a) * 0.0185, -0.012 - t * (L3 - 0.026), Math.sin(a) * 0.0185));
  }
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(hp), 140, 0.0022, 5, false), M.graphite, an, 0, 0, 0);
  /* pata */
  ell(pw, 0.014, 0.014, 0.014, M.graphite, 0, 0, 0);
  ell(pw, 0.05, 0.0195, 0.038, M.rubber, 0.012, -0.0055, 0);
  ell(pw, 0.036, 0.015, 0.03, M.shell, 0.0, 0.003, 0);
  leg.toes = [];
  [-0.027, -0.009, 0.009, 0.027].forEach((zk) => {
    const t1 = new T.Group(); t1.position.set(0.048, -0.012, zk); pw.add(t1);
    ell(t1, 0.016, 0.0105, 0.0105, M.rubber, 0.012, 0, 0);
    const t2 = new T.Group(); t2.position.set(0.027, 0, 0); t1.add(t2);
    ell(t2, 0.012, 0.0092, 0.0092, M.rubber, 0.008, 0, 0);
    ell(t2, 0.006, 0.004, 0.005, M.alu, 0.018, -0.001, 0);
    leg.toes.push([t1, t2]);
  });
  /* pistao hidraulico */
  leg.pbx = (front ? 1 : -1) * 0.034;
  leg.sleeve = mesh(unitCyl, M.graphite, root, 0, 0, 0);
  leg.rod = mesh(unitCyl, M.alu, root, 0, 0, 0);
  leg.pA = new T.Vector3(); leg.pB = new T.Vector3();
  ell(up, 0.0085, 0.0085, 0.0085, M.alu, leg.pbx, -0.045, side * 0.034);
  ell(kn, 0.0085, 0.0085, 0.0085, M.alu, leg.pbx * 0.8, -L2 * 0.68, side * 0.034);
  /* cabo */
  leg.cable = makeCable(root, 0.0058, 12, 6, M.orange);
  legs.push(leg);
  return leg;
}
const legFL = buildLeg(chestG, 1, true, 0.25, 0.2);
const legFR = buildLeg(chestG, -1, true, 0.75, 0.2);
const legHL = buildLeg(pelvisG, 1, false, 0.0, -0.2);
const legHR = buildLeg(pelvisG, -1, false, 0.5, -0.2);

/* --- pescoco --- */
const neckBase = new T.Group(); neckBase.position.set(0.1, 0.075, 0); chestG.add(neckBase);
const NL = 0.056;
const neck = [];
const neckRest = [-1.0, 0.25, 0.25];
let par = neckBase;
for (let i = 0; i < 3; i++) {
  const g = new T.Group();
  g.position.set(0, i ? NL : 0, 0);
  par.add(g);
  const geo = taperedGeo(0.043 - i * 0.003, 0.039 - i * 0.003, NL - 0.004); geo.rotateX(PI);
  mesh(geo, M.shell, g, 0, 0.002, 0);
  const geo2 = taperedGeo(0.026, 0.026, NL); geo2.rotateX(PI);
  mesh(geo2, M.graphite, g, 0, 0, 0);
  torus(g, 0.038, 0.007, M.graphite, 0, 0, 0, PI / 2, 0);
  torus(g, 0.041, 0.002, M.alu, 0, 0.008, 0, PI / 2, 0);
  neck.push(g); par = g;
}
/* coleira */
const collar = new T.Group(); collar.position.set(0, NL * 0.35, 0); neck[1].add(collar);
torus(collar, 0.045, 0.008, M.orange, 0, 0, 0, PI / 2, 0);
const tag = ell(collar, 0.008, 0.017, 0.017, M.led, 0.047, -0.01, 0);
halo(collar, 0.055, -0.01, 0, 0.035, 0.45);
/* cabos do pescoco */
const neckCables = [1, -1].map((s) => makeCable(torso, 0.0055, 16, 6, M.cable));

/* --- cabeca --- */
const head = new T.Group(); head.position.set(0, NL, 0); head.scale.setScalar(1.14); neck[2].add(head);
ell(head, 0.075, 0.062, 0.064, M.shell, 0.05, 0.03, 0);
ell(head, 0.052, 0.034, 0.057, M.glass, 0.084, 0.03, 0);
ell(head, 0.032, 0.004, 0.008, M.led, 0.055, 0.09, 0);
ell(head, 0.05, 0.012, 0.022, M.alu, 0.03, 0.087, 0).rotation.z = 0.05;
/* focinho */
ell(head, 0.07, 0.034, 0.042, M.shell, 0.135, 0.003, 0);
ell(head, 0.045, 0.011, 0.038, M.graphite, 0.125, 0.027, 0).rotation.z = -0.1;
const nose = ell(head, 0.022, 0.016, 0.026, M.glass, 0.201, 0.008, 0);
ell(head, 0.006, 0.0045, 0.008, M.white, 0.214, 0.015, 0.008);
/* mandibula */
const jawP = new T.Group(); jawP.position.set(0.07, -0.028, 0); head.add(jawP);
ell(jawP, 0.062, 0.018, 0.033, M.shell, 0.062, -0.012, 0);
ell(jawP, 0.058, 0.0045, 0.034, M.dark, 0.064, 0.003, 0);
ell(jawP, 0.04, 0.004, 0.012, M.led, 0.066, -0.026, 0);
ell(jawP, 0.03, 0.012, 0.03, M.graphite, 0.014, -0.012, 0);
/* bochechas */
[1, -1].forEach((s) => {
  ell(head, 0.026, 0.026, 0.011, M.graphite, 0.03, -0.004, s * 0.06);
  torus(head, 0.014, 0.0026, M.led, 0.03, -0.004, s * 0.0725, 0, 0);
});
/* olhos */
const visorC = [0.084, 0.03, 0], visorR = [0.052, 0.034, 0.057];
const eyes = [], brows = [];
[1, -1].forEach((s) => {
  const o = onEll(visorC, visorR, [0.5, 0.08, s * 0.85]);
  const g = new T.Group(); g.position.copy(o.p);
  g.lookAt(o.p.clone().add(o.n)); head.add(g);
  torus(g, 0.0175, 0.0028, M.alu, 0, 0, 0.001, 0, 0);
  const ir = ell(g, 0.0135, 0.0135, 0.004, M.eye, 0, 0, 0.001);
  ell(g, 0.0075, 0.0075, 0.003, M.dark, 0, 0, 0.003);
  ell(g, 0.0035, 0.0035, 0.002, M.white, 0.005, 0.005, 0.0042);
  halo(g, 0, 0, 0.012, 0.04, 0.5);
  eyes.push({ g, ir, s });
  /* sobrancelha */
  const bp = new T.Group(); bp.position.set(0.085, 0.07, s * 0.04); head.add(bp);
  ell(bp, 0.022, 0.0055, 0.01, M.shell, 0, 0, 0).rotation.y = 0;
  brows.push({ bp, s });
});
/* orelhas */
function earShape(w, h) {
  const s = new T.Shape();
  s.moveTo(-w, 0);
  s.bezierCurveTo(-w * 1.05, h * 0.5, -w * 0.4, h * 0.85, 0, h);
  s.bezierCurveTo(w * 0.4, h * 0.85, w * 1.05, h * 0.5, w, 0);
  s.lineTo(-w, 0);
  return s;
}
const ears = [];
[1, -1].forEach((s) => {
  const p = new T.Group(); p.position.set(-0.005, 0.07, s * 0.04); head.add(p);
  const g1 = new T.ExtrudeGeometry(earShape(0.037, 0.088), { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 3, curveSegments: 18 });
  g1.rotateY(PI / 2); g1.translate(-0.005, 0, 0);
  mesh(g1, M.shell, p, 0, 0.004, 0);
  const g2 = new T.ExtrudeGeometry(earShape(0.024, 0.068), { depth: 0.004, bevelEnabled: false, curveSegments: 14 });
  g2.rotateY(PI / 2); g2.translate(0.004, 0, 0);
  mesh(g2, M.dark, p, 0, 0.01, 0);
  const g3 = new T.ExtrudeGeometry(earShape(0.008, 0.042), { depth: 0.003, bevelEnabled: false, curveSegments: 8 });
  g3.rotateY(PI / 2); g3.translate(0.008, 0, 0);
  mesh(g3, M.led, p, 0, 0.018, 0);
  ell(p, 0.016, 0.014, 0.016, M.graphite, 0, 0, 0);
  disc(p, 0.011, 0.006, M.alu, 0, 0, s * 0.013);
  ears.push({ p, s });
});

/* --- cauda --- */
const tailBase = new T.Group(); tailBase.position.set(-0.125, 0.048, 0); pelvisG.add(tailBase);
ell(tailBase, 0.03, 0.03, 0.03, M.graphite, 0, 0, 0);
disc(tailBase, 0.022, 0.01, M.alu, 0, 0, 0.026);
disc(tailBase, 0.022, 0.01, M.alu, 0, 0, -0.026);
const tailPitch = new T.Group(); tailPitch.rotation.z = 1.0; tailBase.add(tailPitch);
const tail = [];
const tlen = [0.058, 0.052, 0.047, 0.042, 0.038];
par = tailPitch;
for (let i = 0; i < 5; i++) {
  const g = new T.Group();
  g.position.set(0, i ? tlen[i - 1] : 0, 0);
  par.add(g);
  const r = 0.019 - i * 0.0022;
  const geo = taperedGeo(r, r - 0.0018, tlen[i] - 0.004); geo.rotateX(PI);
  mesh(geo, i % 2 ? M.alu : M.shell, g, 0, 0.002, 0);
  ell(g, r * 0.8, r * 0.8, r * 0.8, M.graphite, 0, 0, 0);
  tail.push(g); par = g;
}
const tipP = new T.Group(); tipP.position.set(0, tlen[4], 0); tail[4].add(tipP);
ell(tipP, 0.011, 0.014, 0.011, M.led, 0, 0.004, 0);
const tipHalo = halo(tipP, 0, 0.004, 0, 0.05, 0.8);

/* sombras */
dog.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
neckCables.forEach((c) => { c.castShadow = false; });
const S = {
  playing: true, gait: 'walk', speed: 0.5, move: 1, phase: 0, t: 0,
  wagT: 0, excite: 0, blinkAt: 2.5, blink: 0, twitchAt: 4, twitch: 0, twitchSide: 1,
  headYaw: 0, ground: 0, autoRotate: false
};
const GAIT = {
  walk: { beta: 0.72, S0: 0.2, H: 0.062, off: { FL: 0.25, FR: 0.75, HL: 0.0, HR: 0.5 } },
  trot: { beta: 0.52, S0: 0.22, H: 0.06, off: { FL: 0.0, FR: 0.5, HL: 0.5, HR: 0.0 } }
};
const BASE_Y = 0.405;
const tv = new T.Vector3();
const stats = { maxReach: 0 };

function solveLeg(leg, fx, fy, a, g, toe) {
  const P = leg.parent;
  const pz = Math.atan2(P.matrixWorld.elements[1], P.matrixWorld.elements[0]);
  tv.set(leg.x0 + fx - L3 * Math.sin(a), fy + PAD + L3 * Math.cos(a), leg.side * LEGZ);
  P.worldToLocal(tv);
  let dx = tv.x - leg.root.position.x, dy = tv.y - leg.root.position.y;
  let D = Math.hypot(dx, dy);
  const maxD = leg.L1 + leg.L2 - 0.004, minD = Math.abs(leg.L1 - leg.L2) + 0.02;
  stats.maxReach = Math.max(stats.maxReach, D / (leg.L1 + leg.L2));
  if (D > maxD) { dx *= maxD / D; dy *= maxD / D; D = maxD; }
  if (D < minD) { dx *= minD / D; dy *= minD / D; D = minD; }
  const th = Math.atan2(dy, dx);
  const A = Math.acos(clamp((leg.L1 * leg.L1 + D * D - leg.L2 * leg.L2) / (2 * leg.L1 * D), -1, 1));
  const al1 = th + leg.bend * A;
  const kx = leg.L1 * Math.cos(al1), ky = leg.L1 * Math.sin(al1);
  const al2 = Math.atan2(dy - ky, dx - kx);
  const al3 = a - PI / 2 - pz;
  leg.up.rotation.z = al1 + PI / 2;
  leg.kn.rotation.z = al2 - al1;
  leg.an.rotation.z = al3 - al2;
  leg.pw.rotation.z = g - a;
  leg.toes.forEach((t, i) => {
    t[0].rotation.z = toe * (i === 0 || i === 3 ? 0.85 : 1);
    t[1].rotation.z = toe * 0.6 - 0.08;
  });
  /* pistao e cabo (coordenadas locais da raiz da perna) */
  const f1 = leg.up.rotation.z, f2 = f1 + leg.kn.rotation.z;
  const zz = leg.side * 0.034;
  const c1 = Math.cos(f1), s1 = Math.sin(f1), c2 = Math.cos(f2), s2 = Math.sin(f2);
  const Kx = -s1 * (-leg.L1), Ky = c1 * (-leg.L1);
  /* ponto A (segmento superior) e B (inferior) */
  const ax = c1 * leg.pbx - s1 * -0.045, ay = s1 * leg.pbx + c1 * -0.045;
  const bxl = leg.pbx * 0.8, byl = -leg.L2 * 0.68;
  const bx = Kx + c2 * bxl - s2 * byl, by = Ky + s2 * bxl + c2 * byl;
  leg.pA.set(ax, ay, zz); leg.pB.set(bx, by, zz);
  const dir = tv.copy(leg.pB).sub(leg.pA);
  const L = dir.length();
  const mid = leg.pA.clone().addScaledVector(dir.normalize(), Math.min(0.06, L * 0.5));
  aim(leg.sleeve, leg.pA, mid, 0.0105);
  aim(leg.rod, mid, leg.pB, 0.0058);
  /* cabo laranja do lado oposto do pistao */
  const sg = -leg.pbx * 0.75;
  const ux = c1 * sg - s1 * -0.03, uy = s1 * sg + c1 * -0.03;
  const lx = Kx + c2 * (sg * 0.7) - s2 * (-leg.L2 * 0.62), ly = Ky + s2 * (sg * 0.7) + c2 * (-leg.L2 * 0.62);
  const cz = leg.side * 0.027;
  const mx = (ux + lx) / 2, my = (uy + ly) / 2;
  let ox = Kx - mx, oy = Ky - my; const ol = Math.hypot(ox, oy) || 1;
  const sag = 0.032;
  ox = ox / ol * sag; oy = oy / ol * sag;
  const pts = [
    new T.Vector3(ux, uy, cz),
    new T.Vector3(lerp(ux, mx + ox, 0.6), lerp(uy, my + oy, 0.6), cz + leg.side * 0.004),
    new T.Vector3(mx + ox, my + oy, cz + leg.side * 0.006),
    new T.Vector3(lerp(lx, mx + ox, 0.6), lerp(ly, my + oy, 0.6), cz + leg.side * 0.004),
    new T.Vector3(lx, ly, cz)
  ];
  leg.cable.setPoints(pts);
}

function updateLeg(leg, G, m, S_) {
  const p = (((S.phase + leg.off) % 1) + 1) % 1;
  const beta = G.beta;
  let fx, fy, a, g, toe;
  if (p < beta) {
    const u = p / beta, s = smooth(0.62, 1, u);
    fx = S_ / 2 - S_ * u; fy = 0;
    a = 0.15 + 0.4 * s; g = -0.35 * s; toe = 0.35 * s;
    leg.inSwing = false;
  } else {
    const u = (p - beta) / (1 - beta);
    const e = u - Math.sin(2 * PI * u) / (2 * PI);
    fx = -S_ / 2 + S_ * e;
    fy = G.H * Math.pow(Math.sin(PI * u), 1.3) * m;
    a = 0.15 + 0.4 * (1 - smooth(0, 0.8, u)) + 0.3 * Math.sin(PI * u);
    g = -0.35 * (1 - smooth(0, 0.5, u));
    toe = 0.35 * (1 - smooth(0, 0.3, u)) - 0.4 * Math.sin(PI * u);
    leg.inSwing = true;
  }
  a = 0.15 + (a - 0.15) * m; g *= m; toe *= m;
  leg.stance = !leg.inSwing;
  solveLeg(leg, fx, fy, a, g, toe);
}
const camTmp = new T.Vector3();
function step(dt) {
  S.t += dt;
  const t = S.t;
  S.move += ((S.playing ? 1 : 0) - S.move) * (1 - Math.exp(-dt * 3));
  if (Math.abs(S.move - (S.playing ? 1 : 0)) < 0.001) S.move = S.playing ? 1 : 0;
  const m = S.move;
  const G = GAIT[S.gait];
  const v = S.speed;
  let cyc = clamp(G.S0 / (v * G.beta), 0.3, 1.3);
  let stride = Math.min(0.27, v * G.beta * cyc);
  S.cycle = cyc;
  const Sm = stride * m;
  S.phase = (S.phase + dt / cyc) % 1;
  S.ground = v * m;
  S.excite = Math.max(0, S.excite - dt * 0.35);
  const ex = S.excite;

  /* tronco */
  const ph = S.phase * PI * 2;
  const walk = S.gait === 'walk';
  const bob = (walk ? 0.0055 : 0.011) * m * Math.cos(2 * ph + (walk ? 0.8 : 0));
  const roll = (walk ? 0.028 : 0.012) * m * Math.sin(ph + 0.3);
  const pitch = (walk ? 0.02 : 0.03) * m * Math.sin(2 * ph + 1.2) + 0.012 * Math.sin(t * 1.5) * (1 - m);
  const breathe = Math.sin(t * 1.7);
  torso.position.y = BASE_Y + bob + 0.002 * breathe;
  torso.rotation.set(roll, 0, pitch);
  const yawC = 0.05 * m * Math.sin(ph + 0.6);
  chestG.rotation.set(0, yawC, 0.01 * m * Math.sin(2 * ph));
  pelvisG.rotation.set(0, -yawC * 0.8, -0.01 * m * Math.sin(2 * ph));
  chestG.scale.set(1, 1 + 0.01 * breathe, 1 + 0.008 * breathe);
  torso.updateMatrixWorld(true);

  /* pernas */
  const off = G.off;
  legFL.off = off.FL; legFR.off = off.FR; legHL.off = off.HL; legHR.off = off.HR;
  legs.forEach((l) => updateLeg(l, G, m, Sm));

  /* pescoco e cabeca */
  const look = (S.autoRotate ? 0.0 : 1) * lerp(0.7, 0.35, m);
  const yawT = 0;
  S.headYaw += (yawT - S.headYaw) * (1 - Math.exp(-dt * 2.5));
  const sway = 0.06 * m * Math.sin(ph + 1.1);
  const lagY = -0.04 * m * Math.sin(2 * ph + 0.6);
  const comp = -pitch / 3;
  neck[0].rotation.set(0, S.headYaw * 0.35, neckRest[0] + comp + lagY * 0.5);
  neck[1].rotation.set(0, S.headYaw * 0.3 + sway * 0.4, neckRest[1] + comp + lagY * 0.4);
  neck[2].rotation.set(0, S.headYaw * 0.35, neckRest[2] + comp - 0.02 * Math.sin(t * 1.3) + lagY * 0.3);
  head.rotation.set(-roll * 0.9 + 0.1 * ex * Math.sin(t * 6), 0, 0.5 + 0.03 * Math.sin(t * 0.9) + 0.0);
  /* mandibula (ofegar) */
  const pant = 0.015 + 0.03 * Math.sin(t * 9) * (0.4 + ex) * (0.3 + ex) + 0.12 * ex;
  jawP.rotation.z = -pant;
  /* piscar */
  S.blinkAt -= dt;
  if (S.blinkAt <= 0) { S.blink = 1; S.blinkAt = 2.2 + Math.random() * 3.5; }
  S.blink = Math.max(0, S.blink - dt * 7);
  const bl = Math.abs(Math.sin(S.blink * PI));
  eyes.forEach((e) => {
    e.ir.scale.y = 0.0135 * (1 - 0.92 * bl) * (1 + 0.1 * ex);
    e.ir.scale.x = 0.0135 * (1 + 0.1 * ex);
  });
  brows.forEach((b) => {
    b.bp.rotation.set(b.s * (-0.1 - 0.25 * ex), 0, b.s * 0.0 + 0.0);
    b.bp.rotation.x = -b.s * (0.15 + 0.2 * ex);
    b.bp.position.y = 0.07 + 0.006 * ex + 0.003 * bl;
  });
  /* orelhas */
  S.twitchAt -= dt;
  if (S.twitchAt <= 0) { S.twitch = 1; S.twitchSide = Math.random() < 0.5 ? 1 : -1; S.twitchAt = 3 + Math.random() * 5; }
  S.twitch = Math.max(0, S.twitch - dt * 4);
  const tw = Math.sin(S.twitch * PI * 2) * S.twitch;
  ears.forEach((e) => {
    const bounce = 0.07 * m * Math.sin(2 * ph - 0.8 + e.s * 0.3);
    const pz = 0.5 - 0.46 * ex + bounce + (e.s === S.twitchSide ? tw * 0.5 : 0);
    e.p.rotation.set(e.s * (0.32 - 0.08 * ex + (e.s === S.twitchSide ? tw * 0.15 : 0)), 0, pz);
  });
  /* cauda */
  S.wagT += dt * (4.5 + 13 * ex + 2 * m);
  const amp = 0.18 + 0.5 * ex + 0.1 * m;
  tailPitch.rotation.z = 1.0 - 0.25 * ex + 0.06 * Math.sin(t * 1.1);
  tail.forEach((g, i) => {
    g.rotation.z = 0.12 + (i ? 0.02 : 0);
    g.rotation.x = amp * Math.sin(S.wagT - i * 0.7) * (0.45 + 0.15 * i);
  });
  tailPitch.rotation.x = amp * 0.6 * Math.sin(S.wagT);
  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  tipHalo.material.opacity = 0.5 + 0.35 * pulse;
  /* leds */
  M.led.color.setHex(ACC).multiplyScalar(0.92 + 0.12 * Math.sin(t * 2.2));
  reactor.children[2].scale.setScalar(1 + 0.04 * Math.sin(t * 2.2));
  lidarTop.rotation.y = t * 2.4;

  /* cabos do pescoco / coluna (espaco do torso) */
  neckCables.forEach((c, i) => {
    const s = i ? -1 : 1;
    const pts = [];
    const refs = [neckBase, neck[1], neck[2], head];
    refs.forEach((r, k) => {
      const v3 = new T.Vector3(k < 3 ? 0.0 : 0.0, k === 0 ? 0.0 : (k === 3 ? 0.0 : 0.0), 0);
      v3.set(k === 3 ? -0.005 : 0.0, k === 3 ? 0.02 : 0.0, s * (k === 0 ? 0.03 : 0.028));
      if (k === 1) v3.y += NL * 0.0;
      r.localToWorld(v3); torso.worldToLocal(v3);
      pts.push(v3);
    });
    /* ponto extra: base do peito */
    const b0 = new T.Vector3(0.0, 0.06, s * 0.04); chestG.localToWorld(b0); torso.worldToLocal(b0);
    pts.unshift(b0);
    c.setPoints(pts);
  });

}

dog.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive&&o.material.color){o.material.metalness=Math.min(o.material.metalness||0,.3);o.material.emissive.copy(o.material.color).multiplyScalar(.1);o.material.emissiveIntensity=1;}});
return {dog,S,halos,step:(dt,mov,v)=>{S.playing=!!mov;S.speed=v;S.gait='trot';step(dt);}};}
async function npcs(){const prep=async(n,alt,pos,luz)=>{const g=(await carregar(n)).scene.clone(true);g.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;const m=o.material;m.metalness=.1;m.roughness=.8;m.emissive=new THREE.Color(0xffffff);m.emissiveMap=m.map;m.emissiveIntensity=n==='Gato'?.55:.1;if(n==='Iara')m.color=new THREE.Color(0xb59f8c);}});
  g.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(g),s=b.getSize(new THREE.Vector3());g.scale.multiplyScalar(alt/s.y);g.updateMatrixWorld(true);b.setFromObject(g);const c=b.getCenter(new THREE.Vector3());g.position.set(-c.x,-b.min.y,-c.z);
  const w=new THREE.Group();w.add(g);const l=new THREE.PointLight(luz,n==='Gato'?9:3,5,2);l.position.set(0,1.6,0);w.add(l);w.position.set(...pos);sceneR.add(w);return w;};
 const mw=mulher(),ms=1.62/1.72;mw.root.scale.setScalar(ms);mw.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive){o.material.emissive.copy(o.material.color).multiplyScalar(.3);o.material.emissiveIntensity=1;}});
 const iara=new THREE.Group();iara.add(mw.root);{const il=new THREE.PointLight(0xffd9a0,3,5,2);il.position.set(0,1.6,0);iara.add(il);}iara.position.set(10.4,0,2.3);sceneR.add(iara);
 let wph=0,wam=0;const wanim=(dt,mov,t)=>{wam+=((mov?1:0)-wam)*Math.min(1,dt*6);wph=(wph+dt*(mov?.55/(1.05*ms):0))%1;mw.step(wph,t,wam);};
 const rc=robocao();rc.halos.forEach(h=>{h.scale.multiplyScalar(.45);h.material.opacity*=.5;});rc.dog.rotation.y=-Math.PI/2;rc.dog.scale.setScalar(1.25);
 const gato=new THREE.Group();gato.add(rc.dog);{const gl=new THREE.PointLight(0xbfe8ff,2.2,4,2);gl.position.set(0,1.1,0);gato.add(gl);}gato.position.set(13.3,0,3.2);sceneR.add(gato);gatoM=gato;
 const ganim=(dt,mov,t,n)=>{rc.S.excite=n.seg===2?.7:0;rc.step(dt,mov,1.0);};
 NP.push({g:iara,anim:wanim,id:'iara',spd:.55,pts:[[10.4,2.2],[12.8,2.5],[14.2,3.0],[12.2,3.4],[9.8,3.4]],i:0,wait:1,g2:0,h:0,tgy:.0},{g:gato,anim:ganim,id:'gato',spd:1.0,pts:[[13.3,3.2],[10.6,2.2],[14.0,2.0],[12.0,3.6],[10.0,3.3]],i:0,wait:.5,g2:0,h:0,seg:1});}
function npcUpd(dt,t){for(const n of NP){const p=n.g.position,pl2=Math.hypot(pl.x-p.x,pl.y-p.z);let mov=0,tx,tz;
  if(uiOpen&&pl2<3.2){tx=pl.x;tz=pl.y;}
  else if(n.seg&&(n.seg===2?pl2<4.5:pl2<3.6)){n.seg=2;tx=pl.x;tz=pl.y;if(pl2>2.0){const dx=tx-p.x,dz=tz-p.z,l=Math.hypot(dx,dz);p.x+=dx/l*n.spd*.8*dt;p.z+=dz/l*n.spd*.8*dt;mov=1;}}
  else if(n.seg===2&&(n.seg=1,0)){}
  else if(n.wait>0)n.wait-=dt;
  else{const q=n.pts[n.i];tx=q[0];tz=q[1];const dx=tx-p.x,dz=tz-p.z,l=Math.hypot(dx,dz);if(l<.15){n.wait=1.5+Math.random()*3;n.i=Math.floor(Math.random()*n.pts.length);}else{p.x+=dx/l*n.spd*dt;p.z+=dz/l*n.spd*dt;mov=1;}}
  if(tx!==undefined&&Math.hypot(tx-p.x,tz-p.z)>.05){const hd=Math.atan2(tx-p.x,tz-p.z);let dh=hd-n.h;dh=Math.atan2(Math.sin(dh),Math.cos(dh));n.h+=dh*Math.min(1,dt*4);}
  n.g.rotation.y=n.h;n.g2+=dt*(mov?(n.seg?11:7):2);
  if(n.anim){n.anim(dt,mov,t,n);p.y=0;}else{n.g.children[0].position.y=0;p.y=mov?Math.abs(Math.sin(n.g2))*(n.seg?.04:.035):Math.sin(n.g2)*.008;n.g.rotation.z=mov?Math.sin(n.g2)*(n.seg?.05:.03):0;}
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
const CS=1.45;
async function casaFavela(){const T=THREE;const grp=new THREE.Group();
let seed=20241110;
const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
const rr=(a,b)=>a+R()*(b-a);
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};

function speckle(x,w,h,n,cols,maxS,a0,a1){
  a0=a0===undefined?.05:a0; a1=a1===undefined?.2:a1;
  for(let i=0;i<n;i++){
    x.fillStyle=cols[(R()*cols.length)|0];
    x.globalAlpha=a0+R()*(a1-a0);
    const s=1+R()*maxS;
    x.fillRect(R()*w,R()*h,s,s*(.5+R()*2));
  }
  x.globalAlpha=1;
}
function drips(x,w,h,n,rgb){
  for(let i=0;i<n;i++){
    const px=R()*w,len=30+R()*h*.5,wd=2+R()*7;
    const g=x.createLinearGradient(0,0,0,len);
    g.addColorStop(0,'rgba('+rgb+','+(.22+R()*.2).toFixed(2)+')');
    g.addColorStop(1,'rgba('+rgb+',0)');
    x.save();x.translate(px,R()*h*.4);x.fillStyle=g;x.fillRect(0,0,wd,len);x.restore();
  }
}
function blobPts(cx,cy,r){
  const n=10+((R()*6)|0),p=[];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,rad=r*(.55+R()*.75);
    p.push([cx+Math.cos(a)*rad*(1+R()*.4),cy+Math.sin(a)*rad*(.7+R()*.4)]);
  }
  return p;
}
function pathOf(x,p){x.beginPath();p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();}
function mottle(x,w,h,n){
  for(let i=0;i<n;i++){
    const cx=R()*w,cy=R()*h,r=40+R()*90,dark=R()<.5;
    const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,dark?'rgba(40,25,20,.15)':'rgba(255,240,225,.12)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
  }
}

/* ---------- texturas procedurais ---------- */
function plaster(base,patchCols,np,bricks,dripRGB){
  const [c,x]=mk(512,512);
  x.fillStyle=base;x.fillRect(0,0,512,512);
  mottle(x,512,512,32);
  for(let i=0;i<np;i++){
    const cx=rr(90,420),cy=rr(90,420),r=rr(28,75),p=blobPts(cx,cy,r);
    x.save();pathOf(x,p);x.clip();
    x.fillStyle=patchCols[(R()*patchCols.length)|0];
    x.fillRect(cx-r*2,cy-r*2,r*4,r*4);
    if(bricks){
      x.strokeStyle='rgba(55,35,28,.55)';x.lineWidth=2;
      for(let by=cy-r*2,row=0;by<cy+r*2;by+=16,row++){
        x.beginPath();x.moveTo(cx-r*2,by);x.lineTo(cx+r*2,by);x.stroke();
        for(let bx=cx-r*2+(row%2)*20;bx<cx+r*2;bx+=40){x.beginPath();x.moveTo(bx,by);x.lineTo(bx,by+16);x.stroke();}
      }
    }
    x.restore();
    pathOf(x,p);x.strokeStyle='rgba(255,235,215,.4)';x.lineWidth=3;x.stroke();
    x.save();x.translate(2,2);pathOf(x,p);x.strokeStyle='rgba(30,15,10,.35)';x.lineWidth=2;x.stroke();x.restore();
  }
  drips(x,512,512,22,dripRGB||'60,40,30');
  speckle(x,512,512,2200,['#000','#fff','#5a4030'],3);
  return c;
}
function stoneTex(){
  const [c,x]=mk(512,512);
  x.fillStyle='#3e3b37';x.fillRect(0,0,512,512);
  let y=0;
  while(y<512){
    const h=rr(46,74);let xx=-rr(0,60);
    while(xx<512){
      const w=rr(70,140),v=(rr(105,150))|0;
      x.fillStyle='rgb('+v+','+(v-3)+','+(v-9)+')';x.fillRect(xx+3,y+3,w-6,h-6);
      x.fillStyle='rgba(255,255,255,.08)';x.fillRect(xx+3,y+3,w-6,5);
      x.fillStyle='rgba(0,0,0,.14)';x.fillRect(xx+3,y+h-9,w-6,6);
      xx+=w;
    }
    y+=h;
  }
  mottle(x,512,512,18);
  drips(x,512,512,18,'25,22,20');
  speckle(x,512,512,2500,['#000','#fff','#6a6258'],3);
  return c;
}
function rustTex(){
  const [c,x]=mk(512,512);
  x.fillStyle='#8f5636';x.fillRect(0,0,512,512);
  const cols=['190,105,55','110,55,35','205,170,130','125,128,122','160,80,45'];
  for(let i=0;i<80;i++){
    const cx=R()*512,cy=R()*512,r=20+R()*70,k=cols[(R()*cols.length)|0];
    const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,'rgba('+k+','+(.28+R()*.3).toFixed(2)+')');
    g.addColorStop(1,'rgba('+k+',0)');
    x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
  }
  for(let i=0;i<150;i++){
    const x0=R()*512,dark=R()<.6;
    x.strokeStyle='rgba('+(dark?'60,30,20':'200,150,110')+','+(.1+R()*.2).toFixed(2)+')';
    x.lineWidth=.5+R()*2;x.beginPath();
    const y0=R()*512;x.moveTo(x0,y0);x.lineTo(x0+rr(-3,3),y0+rr(60,300));x.stroke();
  }
  speckle(x,512,512,3000,['#000','#e8c8a0','#3a1a10'],3,.05,.3);
  return c;
}
function woodTex(dark){
  const [c,x]=mk(512,512),ph=64;
  for(let i=0;i<8;i++){
    const v=rr(.75,1.05);
    x.fillStyle='rgb('+((165*v)|0)+','+((102*v)|0)+','+((54*v)|0)+')';
    x.fillRect(0,i*ph,512,ph);
    for(let k=0;k<14;k++){
      x.strokeStyle='rgba(50,28,12,'+(.08+R()*.15).toFixed(2)+')';x.lineWidth=1;
      const yy=i*ph+rr(4,ph-4);
      x.beginPath();x.moveTo(0,yy);x.bezierCurveTo(150,yy+rr(-4,4),350,yy+rr(-4,4),512,yy+rr(-3,3));x.stroke();
    }
    x.fillStyle='rgba(20,10,4,.75)';x.fillRect(0,i*ph,512,2);x.fillRect(0,i*ph+ph-1,512,2);
    x.fillStyle='rgba(30,20,12,.7)';
    for(let n=0;n<2;n++){x.beginPath();x.arc(30+n*400+rr(-3,3),i*ph+ph/2,2.2,0,7);x.fill();}
  }
  speckle(x,512,512,1800,['#fff','#000','#c8c0b0'],3);
  if(dark){x.fillStyle='rgba(8,5,3,.62)';x.fillRect(0,0,512,512);}
  return c;
}
function doorTex(){
  const [c,x]=mk(256,448);
  x.fillStyle='#3d2616';x.fillRect(0,0,256,448);
  for(let i=0;i<6;i++){
    const v=rr(.8,1.15);
    x.fillStyle='rgb('+((78*v)|0)+','+((48*v)|0)+','+((28*v)|0)+')';x.fillRect(i*43+2,2,39,444);
    x.fillStyle='rgba(0,0,0,.4)';x.fillRect(i*43,0,3,448);
  }
  x.strokeStyle='rgba(20,10,5,.7)';x.lineWidth=5;x.strokeRect(28,36,200,160);x.strokeRect(28,230,200,170);
  x.fillStyle='#b9b2a4';x.beginPath();x.arc(214,230,9,0,7);x.fill();
  drips(x,256,448,10,'20,10,5');
  speckle(x,256,448,300,['#000','#c9b79a'],3);
  return c;
}
function garageTex(){
  const W=512,H=358,[c,x]=mk(W,H);
  x.fillStyle='#8c3b2d';x.fillRect(0,0,W,H);
  const cols=['162,74,53','107,42,32','179,106,74'];
  for(let i=0;i<60;i++){
    const cx=R()*W,cy=R()*H,r=20+R()*60,k=cols[(R()*3)|0];
    const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,'rgba('+k+',.4)');g.addColorStop(1,'rgba('+k+',0)');
    x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
  }
  for(let y=0;y<H;y+=36){
    x.fillStyle='rgba(0,0,0,.28)';x.fillRect(0,y,W,3);
    x.fillStyle='rgba(255,200,170,.12)';x.fillRect(0,y+3,W,2);
  }
  drips(x,W,H,25,'40,15,10');
  speckle(x,W,H,1500,['#000','#e0b090'],3);
  x.lineCap='round';x.lineJoin='round';
  function tag(){
    x.beginPath();
    x.moveTo(190,150);x.bezierCurveTo(130,105,105,190,170,208);x.bezierCurveTo(235,225,190,295,115,262);
    x.moveTo(252,292);x.lineTo(252,138);x.bezierCurveTo(335,115,345,212,262,216);x.lineTo(345,292);
    x.moveTo(300,222);x.bezierCurveTo(365,165,440,195,405,250);x.bezierCurveTo(385,280,330,270,345,240);
    x.stroke();
  }
  x.save();x.translate(4,4);x.strokeStyle='rgba(40,15,12,.5)';x.lineWidth=13;tag();x.restore();
  x.strokeStyle='rgba(238,232,224,.95)';x.lineWidth=9;tag();
  const g=x.createLinearGradient(0,H*.7,0,H);
  g.addColorStop(0,'rgba(30,18,10,0)');g.addColorStop(1,'rgba(30,18,10,.5)');
  x.fillStyle=g;x.fillRect(0,H*.7,W,H*.3);
  return c;
}
function windowBarred(){
  const [c,x]=mk(256,320);
  x.fillStyle='#6b4a3a';x.fillRect(0,0,256,320);
  x.fillStyle='rgba(255,230,200,.18)';x.fillRect(0,0,256,6);
  const g=x.createLinearGradient(0,16,0,304);g.addColorStop(0,'#33424f');g.addColorStop(1,'#141c24');
  x.fillStyle=g;x.fillRect(16,16,224,288);
  x.fillStyle='rgba(255,255,255,.09)';x.beginPath();x.moveTo(16,16);x.lineTo(120,16);x.lineTo(16,150);x.fill();
  x.strokeStyle='#2a2522';x.lineWidth=7;
  for(let i=0;i<=6;i++){x.beginPath();x.moveTo(16+i*37.3,16);x.lineTo(16+i*37.3,304);x.stroke();}
  for(let i=0;i<2;i++){x.beginPath();x.moveTo(16,110+i*100);x.lineTo(240,110+i*100);x.stroke();}
  x.strokeStyle='rgba(20,10,5,.7)';x.lineWidth=6;x.strokeRect(3,3,250,314);
  speckle(x,256,320,300,['#000','#c9b79a'],2);
  return c;
}
function windowCurtain(){
  const [c,x]=mk(256,256);
  x.fillStyle='#cfc8b8';x.fillRect(0,0,256,256);
  const g=x.createLinearGradient(0,14,0,242);g.addColorStop(0,'#5d7688');g.addColorStop(1,'#27323b');
  x.fillStyle=g;x.fillRect(14,14,228,228);
  x.fillStyle='#e6dfce';x.fillRect(14,14,228,150);
  for(let i=0;i<14;i++){
    x.fillStyle='rgba(120,105,85,'+(.08+R()*.12).toFixed(2)+')';
    x.fillRect(14+i*16.3,14,5+R()*5,150);
  }
  x.fillStyle='rgba(60,40,30,.5)';x.fillRect(120,14,4,228);
  x.strokeStyle='rgba(60,50,40,.7)';x.lineWidth=6;x.strokeRect(3,3,250,250);
  speckle(x,256,256,300,['#000','#8a7a60'],2);
  return c;
}
function doorwayTex(){
  const [c,x]=mk(256,320);
  const g=x.createLinearGradient(0,0,0,320);g.addColorStop(0,'#0e0907');g.addColorStop(1,'#241710');
  x.fillStyle=g;x.fillRect(0,0,256,320);
  x.fillStyle='rgba(255,196,120,.16)';x.fillRect(150,60,70,110);
  x.fillStyle='rgba(0,0,0,.5)';x.fillRect(184,60,3,110);
  x.strokeStyle='#5a3b24';x.lineWidth=12;x.strokeRect(6,6,244,308);
  return c;
}
function matOf(canvasEl,rough,metal){
  const t=new T.CanvasTexture(canvasEl);
  t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return new T.MeshStandardMaterial({map:t,roughness:rough===undefined?.95:rough,metalness:metal||0});
}
function decalMat(canvasEl){
  const t=new T.CanvasTexture(canvasEl);
  t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return new T.MeshStandardMaterial({map:t,roughness:.75});
}

const M={
  pink:  matOf(plaster('#a8766a',['#8a4a38'],8,true,'70,40,35')),
  tan:   matOf(plaster('#a89170',['#8a4f3a','#c7b28b'],7,true,'70,50,35')),
  tank:  matOf(plaster('#5b86ae',['#c9985a','#d2c09a','#d9ad52','#3d5f82'],10,false,'30,50,75')),
  conc:  matOf(plaster('#8b8883',['#6f6c68','#a39f98'],6,false,'40,38,35')),
  stone: matOf(stoneTex()),
  wood:  matOf(woodTex(false),.9),
  dark:  matOf(woodTex(true),.95),
  rust:  matOf(rustTex(),.7,.35),
  top:   new T.MeshStandardMaterial({color:0x3b3d40,roughness:.9})
};
M.rust.side=T.DoubleSide;

function worldUV(g,size,ox,oy){
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
    const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    let u,v;
    if(ax>=ay&&ax>=az){u=p.getZ(i);v=p.getY(i);}
    else if(ay>=az){u=p.getX(i);v=p.getZ(i);}
    else{u=p.getX(i);v=p.getY(i);}
    uv.setXY(i,u/size+ox,v/size+oy);
  }
  uv.needsUpdate=true;
}
function finish(g,m){const me=new T.Mesh(g,m);me.castShadow=true;me.receiveShadow=true;grp.add(me);return me;}
function box(w,h,d,x,y,z,m,size){
  const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);
  worldUV(g,size||3,R(),R());
  return finish(g,m);
}
function wedge(x0,x1,zf,zb,y0,yf,yb,m,size){
  const P=[];
  const q=(a,b,c,d)=>{P.push(...a,...b,...c,...a,...c,...d);};
  q([x0,y0,zf],[x1,y0,zf],[x1,yf,zf],[x0,yf,zf]);
  q([x1,y0,zb],[x0,y0,zb],[x0,yb,zb],[x1,yb,zb]);
  q([x1,y0,zf],[x1,y0,zb],[x1,yb,zb],[x1,yf,zf]);
  q([x0,y0,zb],[x0,y0,zf],[x0,yf,zf],[x0,yb,zb]);
  q([x0,yf,zf],[x1,yf,zf],[x1,yb,zb],[x0,yb,zb]);
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(P,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(new Array(P.length/3*2).fill(0),2));
  g.computeVertexNormals();
  worldUV(g,size||3,R(),R());
  return finish(g,m);
}
function decal(c,w,h,x,y,z,ry){
  const me=new T.Mesh(new T.PlaneGeometry(w,h),decalMat(c));
  me.position.set(x,y,z);me.rotation.y=ry||0;me.receiveShadow=true;grp.add(me);return me;
}
function roofSheet(W,L,ridges,x,y,z,angle){
  const g=new T.PlaneGeometry(W,L,ridges*8,1);
  g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,Math.sin(p.getX(i)/W*ridges*Math.PI*2)*.04);
  g.computeVertexNormals();
  const uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*W/3,uv.getY(i)*L/3);
  const me=finish(g,M.rust);
  me.position.set(x,y,z);me.rotation.x=angle;
  return me;
}
box(6.8,.2,4.6,-.2,-.1,.2,M.conc,3);
/* térreo */
box(3.2,1.8,3.2,-1.6,.9,0,M.stone,2.2);
box(2.8,1.8,3.2,1.4,.9,0,M.tan,3);
box(3.3,.12,3.3,-1.6,1.8,0,M.conc,3);           // cornija

/* andar de cima (esquerda) com topo inclinado */
wedge(-3.2,0,1.6,-1.6,1.86,3.46,4.06,M.pink,3);

/* caixa d'água e topo */
box(2.5,2.7,1.4,1.55,3.15,-.9,M.tank,3);
box(2.8,.16,1.7,1.55,4.58,-.85,M.wood,1.5);
box(2.8,.12,.1,1.55,4.72,-.05,M.wood,1.5);
box(2.8,.12,.1,1.55,4.72,-1.65,M.wood,1.5);
box(.1,.12,1.7,.2,4.72,-.85,M.wood,1.5);
box(.1,.12,1.7,2.9,4.72,-.85,M.wood,1.5);
box(2.6,.04,1.5,1.55,4.68,-.85,M.top,3);
box(.45,.38,.4,.95,4.9,-1,M.wood,1);
box(.54,.06,.48,.95,5.12,-1,M.wood,1);

/* varanda */
box(2.8,.12,1.9,1.4,1.86,.75,M.wood,1.5);
box(2.8,1.55,.04,1.4,2.7,-.18,M.dark,2);
decal(doorwayTex(),.7,.9,1,2.45,-.15,0);
const roofY=z=>3.3-(z-.75)*.263;
function post(x,z){const h=roofY(z)-1.92-.03;box(.08,h,.08,x,1.92+h/2,z,M.wood,1);}
[.12,.98,1.85,2.72].forEach(x=>post(x,1.62));
post(2.72,.7);post(2.72,-.12);
box(2.7,.06,.06,1.42,2.45,1.62,M.wood,1);
box(2.7,.06,.06,1.42,2.12,1.62,M.wood,1);
box(.06,.06,1.8,2.72,2.45,.75,M.wood,1);
box(.06,.06,1.8,2.72,2.12,.75,M.wood,1);
for(let i=0;i<9;i++)box(.035,.55,.035,.2+i*.3,2.2,1.62,M.wood,1);

/* telhados */
const A1=Math.atan(.6/3.2);
roofSheet(3.5,3.9,19,-1.55,3.8,0,A1);
roofSheet(3.2,2.0,17,-1.8,4.1,-1.15,A1);
roofSheet(3.0,2.3,16,1.55,3.3,.75,Math.atan(.263));
// blocos sobre o telhado
[[-2.6,.4],[-1.1,.9],[-2.0,-.5],[-.6,-.9],[-2.9,1.2]].forEach(([x,z])=>{
  const b=box(.34,.15,.2,0,0,0,M.conc,1);
  b.position.set(x,3.8-z*.1875+.1,z);b.rotation.set(A1,R()*1,0);
});

/* portas e janelas — frente */
box(2.2,1.5,.08,-1.65,.75,1.62,M.conc,3);
decal(garageTex(),2,1.4,-1.65,.72,1.665,0);
box(.7,1.3,.08,.6,.65,1.62,M.conc,3);
decal(doorTex(),.56,1.18,.6,.62,1.665,0);
box(.8,.9,.08,1.85,1,1.62,M.conc,3);
decal(windowCurtain(),.68,.78,1.85,1,1.665,0);
box(.92,.06,.18,1.85,.55,1.66,M.conc,3);
[-2.45,-1].forEach(x=>{
  box(.76,.92,.06,x,2.6,1.62,M.conc,3);
  decal(windowBarred(),.62,.78,x,2.6,1.655,0);
  box(.82,.06,.16,x,2.12,1.66,M.conc,3);
});
/* janela lateral esquerda */
box(.06,.92,.76,-3.2,2.6,.1,M.conc,3);
decal(windowBarred(),.62,.78,-3.235,2.6,.1,-Math.PI/2);
return grp;}

async function montarCidade(){
 const T=THREE,CITY=new THREE.Group();CITY.scale.setScalar(CS);sceneC.add(CITY);
 const FAV=new Set(['0,7','0,8','1,7','1,8']);
/* ---------- utilidades ---------- */
let seed=987654;
const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
const rr=(a,b)=>a+R()*(b-a);
const ri=(a,b)=>Math.floor(rr(a,b+1));
const pick=a=>a[(R()*a.length)|0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};
/* ---------- helpers de instâncias ---------- */
const _m=new T.Matrix4(),_q=new T.Quaternion(),_p=new T.Vector3(),_s=new T.Vector3(),_e=new T.Euler(),_c=new T.Color();
function setM(im,i,x,y,z,sx,sy,sz,ry,rx,rz){
  _e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_p.set(x,y,z);_s.set(sx,sy,sz);
  _m.compose(_p,_q,_s);im.setMatrixAt(i,_m);
}
function inst(geo,mat,n,shadow,recv){
  const im=new T.InstancedMesh(geo,mat,Math.max(n,1));
  im.count=n;
  im.castShadow=!!shadow;im.receiveShadow=recv!==false;im.frustumCulled=false;
  CITY.add(im);return im;
}
function setColors(im,cols){
  cols.forEach((c,i)=>{_c.set(c);im.setColorAt(i,_c);});
  if(im.instanceColor)im.instanceColor.needsUpdate=true;
}
const BOX=new T.BoxGeometry(1,1,1);
const BOXB=new T.BoxGeometry(1,1,1);BOXB.translate(0,.5,0);

/* ---------- parâmetros da cidade ---------- */
const NB=9,P=17,B=12,RW=5,HALF=4,LEN=160;
const bc=i=>(i-HALF)*P;      // centro do quarteirão
const rl=k=>(k-4.5)*P;       // eixo das ruas
const RIVER=6,ZR=bc(RIVER),RHALF=B/2+.75;
const inRiver=z=>Math.abs(z-ZR)<RHALF+1.2;

/* ---------- texturas ---------- */
function ctex(c,rx,ry){
  const t=new T.CanvasTexture(c);
  t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(rx)t.repeat.set(rx,ry||1);return t;
}
function speckle(x,w,h,n,cols,s,a0,a1){
  for(let i=0;i<n;i++){
    x.fillStyle=cols[(R()*cols.length)|0];x.globalAlpha=a0+R()*(a1-a0);
    const z=1+R()*s;x.fillRect(R()*w,R()*h,z,z);
  }
  x.globalAlpha=1;
}
function roadCanvas(){
  const [c,x]=mk(512,128);
  x.fillStyle='#2b2d32';x.fillRect(0,0,512,128);
  speckle(x,512,128,1800,['#000','#555','#777'],2,.05,.25);
  x.fillStyle='#cfcdc0';x.fillRect(0,6,512,3);x.fillRect(0,119,512,3);
  for(let k=0;k<4;k++)x.fillRect(k*128+24,62,64,4);
  return c;
}
function crossCanvas(){
  const [c,x]=mk(256,256);
  x.fillStyle='#2b2d32';x.fillRect(0,0,256,256);
  speckle(x,256,256,900,['#000','#555','#777'],2,.05,.25);
  x.fillStyle='#d8d6c8';
  for(let i=0;i<9;i++){
    const o=18+i*27;
    x.fillRect(o,6,15,26);x.fillRect(o,224,15,26);
    x.fillRect(6,o,26,15);x.fillRect(224,o,26,15);
  }
  return c;
}
function grassCanvas(){
  const [c,x]=mk(256,256);
  x.fillStyle='#5f8a4b';x.fillRect(0,0,256,256);
  speckle(x,256,256,3500,['#4a7a3c','#6e9a58','#527d44','#7aa660'],3,.15,.5);
  return c;
}
function waterCanvas(){
  const [c,x]=mk(256,64);
  x.fillStyle='#3b7fb0';x.fillRect(0,0,256,64);
  for(let i=0;i<46;i++){
    x.strokeStyle='rgba(210,235,255,'+(.08+R()*.18).toFixed(2)+')';x.lineWidth=1+R()*1.5;
    const y=R()*64,x0=R()*256;x.beginPath();x.moveTo(x0,y);x.bezierCurveTo(x0+20,y-3,x0+40,y+3,x0+rr(50,90),y);x.stroke();
  }
  return c;
}
function glowCanvas(){
  const [c,x]=mk(128,128);
  const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);return c;
}

/* ---------- materiais ---------- */
const U={uNight:{value:0}};
const bMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.78,metalness:.04});
bMat.onBeforeCompile=sh=>{
  sh.uniforms.uNight=U.uNight;
  sh.vertexShader=sh.vertexShader
    .replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
    .replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 wp0=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      wp0=instanceMatrix*wp0;
      #endif
      vWP=(modelMatrix*wp0).xyz;vWN=normalize(normal);`);
  sh.fragmentShader=sh.fragmentShader
    .replace('#include <common>',`#include <common>
      varying vec3 vWP;varying vec3 vWN;uniform float uNight;
      float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}`)
    .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      if(abs(vWN.y)<.5){
        float u=abs(vWN.x)>.5?vWP.z:vWP.x;
        vec2 cell=vec2(u/1.15,(vWP.y-.12)/.9);
        vec2 id=floor(cell);vec2 f=fract(cell);
        float aa=smoothstep(.12,.4,max(fwidth(cell.x),fwidth(cell.y)));
        float win=step(.16,f.x)*step(f.x,.84)*step(.2,f.y)*step(f.y,.78)*step(1.0,id.y);
        float key=abs(vWN.x)>.5?vWP.x:vWP.z;
        float hh=h21(id+vec2(key*1.31,key*.73));
        float lit=step(.5,hh);
        win*=(1.0-aa);
        vec3 glass=mix(vec3(.13,.19,.26),vec3(.22,.32,.43),hh*.5);
        diffuseColor.rgb=mix(diffuseColor.rgb,glass,win);
        roughnessFactor=mix(roughnessFactor,.16,win);
        vec3 wc=mix(vec3(1.,.78,.45),vec3(.7,.86,1.),step(.82,hh));
        totalEmissiveRadiance+=win*lit*uNight*wc*(.55+.55*hh);
        totalEmissiveRadiance+=aa*uNight*.08*vec3(1.,.8,.5)*step(1.0,id.y);
      }`);
};

const roadTex=ctex(roadCanvas(),LEN/16,1);
const roadMat=new T.MeshStandardMaterial({map:roadTex,roughness:.92,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const crossMat=new T.MeshStandardMaterial({map:ctex(crossCanvas()),roughness:.92,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const grassTex=ctex(grassCanvas(),160,160);
const groundMat=new T.MeshStandardMaterial({map:grassTex,roughness:1});
const waterTex=ctex(waterCanvas(),70,4);
const waterMat=new T.MeshStandardMaterial({map:waterTex,roughness:.12,metalness:.2,transparent:true,opacity:.93});
const slabMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.95});
const metalMat=new T.MeshStandardMaterial({color:'#6b7280',roughness:.5,metalness:.6});
const darkMat=new T.MeshStandardMaterial({color:'#2a2f38',roughness:.6,metalness:.4});
const whiteMat=new T.MeshStandardMaterial({color:'#e8edf2',roughness:.4,metalness:.3});
const panelMat=new T.MeshStandardMaterial({color:'#1d3b6e',roughness:.25,metalness:.7});
const treeTrunkMat=new T.MeshStandardMaterial({color:'#5b3f2a',roughness:1});
const treeLeafMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true});
const lampHeadMat=new T.MeshBasicMaterial({color:0xffffff});
const glowMat=new T.MeshBasicMaterial({map:ctex(glowCanvas()),color:'#ffd9a0',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
const headMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
const tailMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
const sigMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
const cyanMat=new T.MeshBasicMaterial({color:'#4de3ff',toneMapped:false});
const beamMat=new T.MeshBasicMaterial({color:'#5be6ff',transparent:true,opacity:.15,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});

/* ---------- chão, rio, colinas ---------- */
const ground=new T.Mesh(new T.PlaneGeometry(1200,1200).rotateX(-Math.PI/2),groundMat);
ground.position.y=-.03;ground.receiveShadow=true;CITY.add(ground);

const water=new T.Mesh(new T.PlaneGeometry(900,RHALF*2).rotateX(-Math.PI/2),waterMat);
water.position.set(0,.0,ZR);water.receiveShadow=true;CITY.add(water);

const hillMat=new T.MeshStandardMaterial({color:'#5e7f55',roughness:1,flatShading:true});
const hillMat2=new T.MeshStandardMaterial({color:'#6f8d62',roughness:1,flatShading:true});
for(let i=0;i<22;i++){
  const a=i/22*Math.PI*2+rr(-.1,.1),r=rr(360,520);
  const h=new T.Mesh(new T.IcosahedronGeometry(1,1),i%2?hillMat:hillMat2);
  h.scale.set(rr(70,140),rr(28,70),rr(70,140));
  h.position.set(Math.cos(a)*r,-10,Math.sin(a)*r);
  CITY.add(h);
}

/* ---------- ruas e cruzamentos ---------- */
const roadGeo=new T.PlaneGeometry(LEN,RW).rotateX(-Math.PI/2);
for(let k=0;k<10;k++){
  const rh=new T.Mesh(roadGeo,roadMat);rh.position.set(0,.02,rl(k));rh.receiveShadow=true;CITY.add(rh);
  const rv=new T.Mesh(roadGeo,roadMat);rv.rotation.y=Math.PI/2;rv.position.set(rl(k),.02,0);rv.receiveShadow=true;CITY.add(rv);
}
const crossIM=inst(new T.PlaneGeometry(RW,RW).rotateX(-Math.PI/2),crossMat,100,false,true);
for(let k=0;k<10;k++)for(let m=0;m<10;m++)setM(crossIM,k*10+m,rl(k),.04,rl(m),1,1,1,0);
// pontes (guarda-corpos)
const railIM=inst(BOX,whiteMat,20,true,true);
for(let k=0;k<10;k++){
  setM(railIM,k*2,rl(k)-2.4,.45,ZR,.14,.5,RHALF*2+.6,0);
  setM(railIM,k*2+1,rl(k)+2.4,.45,ZR,.14,.5,RHALF*2+.6,0);
}

/* ---------- quarteirões, prédios, parques ---------- */
const blocks=[];
for(let j=0;j<NB;j++)for(let i=0;i<NB;i++){
  if(j===RIVER)continue;
  const dd=Math.hypot(i-HALF,j-HALF);
  let type='bld';
  if(i===HALF&&j===HALF)type='center';
  else if(dd>1.6&&R()<.16)type='park';
  if(FAV.has(i+','+j))type='fav';else if(i===6&&j===2)type='clear';else if(i===8&&j===1)type='hub';blocks.push({i,j,x:bc(i),z:bc(j),type});
}
const slabIM=inst(BOX,slabMat,blocks.length,false,true);
blocks.forEach((b,n)=>{
  setM(slabIM,n,b.x,.06,b.z,B,.12,B,0);
});
setColors(slabIM,blocks.map(b=>b.type==='park'?'#6e9e5a':b.type==='center'?'#cfcec6':b.type==='clear'?'#6b6560':b.type==='fav'?'#7a7068':'#aaa9a3'));

const bl=[],roofUnits=[],panels=[],antennas=[],towers=[],trees=[],ponds=[];
const q9=v=>Math.max(1.8,Math.round(v/.9)*.9);
const glassPal=['#5f7d9c','#6f8cab','#4f6b88','#7f98b3','#6a8aa0','#8b95a8','#5d7f86'];
const lowPal=['#d9b99b','#c79a82','#b9a08d','#d8c08e','#a9b8c4','#c98d7a','#bcc7a4','#e0d2b8'];
function addBuilding(x,z,w,d,h,col,noTier){
  bl.push({x,y:.12,z,w,d,h,col});
  let top=.12+h,tw=w,td=d,tx=x,tz=z;
  if(!noTier&&h>18&&R()<.55){
    const h2=q9(rr(4,12));tw=w*.68;td=d*.68;tx=x+rr(-.4,.4);tz=z+rr(-.4,.4);
    bl.push({x:tx,y:top,z:tz,w:tw,d:td,h:h2,col});top+=h2;
  }
  if(h>34&&R()<.7)antennas.push({x:tx,z:tz,y:top,h:rr(3,7)});
  if(h>40)towers.push({x:tx,z:tz,y:top,w:tw});
  const nr=ri(1,2);
  for(let r=0;r<nr;r++)roofUnits.push({x:tx+rr(-tw*.3,tw*.3),z:tz+rr(-td*.3,td*.3),y:top,s:rr(.7,1.2)});
  if(h<16&&R()<.42){
    panels.push({x:tx+rr(-tw*.2,tw*.2)-.7,z:tz+rr(-td*.15,td*.15),y:top});
    panels.push({x:tx+rr(-tw*.2,tw*.2)+.7,z:tz+rr(-td*.15,td*.15)+.9,y:top});
  }
  return {top,x:tx,z:tz,w:tw};
}
let centerInfo=null;
blocks.forEach(b=>{
  if(b.type==='fav'||b.type==='clear'||b.type==='hub')return;
  if(b.type==='park'){
    const nt=ri(12,20);
    for(let t=0;t<nt;t++)trees.push({x:b.x+rr(-5.2,5.2),z:b.z+rr(-5.2,5.2),y:.12,s:rr(1,1.6)});
    if(R()<.4)ponds.push({x:b.x+rr(-2,2),z:b.z+rr(-2,2),r:rr(1.8,2.8)});
    return;
  }
  if(b.type==='center'){centerInfo=addBuilding(b.x,b.z,7.5,7.5,q9(72),'#9fb6cc',true);return;}
  const dd=Math.hypot(b.i-HALF,b.j-HALF);
  const hmax=lerp(58,7,Math.pow(clamp(dd/5.4,0,1),.8));
  const pal=dd<2.8?glassPal:lowPal;
  const mkH=boost=>{let h=hmax*rr(.35,1.05)*(boost||1);if(dd<2.4)h=Math.max(h,18);return q9(Math.max(h,3.6));};
  const lay=R();
  if(lay<.28){
    addBuilding(b.x+rr(-.4,.4),b.z+rr(-.4,.4),rr(8,9.6),rr(8,9.6),mkH(1.15),pick(pal));
  }else if(lay<.55){
    const ax=R()<.5;
    [-1,1].forEach(s=>{
      const cw=ax?rr(3.6,4.5):rr(7.6,9.2),cd=ax?rr(7.6,9.2):rr(3.6,4.5);
      addBuilding(b.x+(ax?s*2.5:0)+rr(-.2,.2),b.z+(ax?0:s*2.5)+rr(-.2,.2),cw,cd,mkH(1),pick(pal));
    });
  }else{
    [-1,1].forEach(sx=>[-1,1].forEach(sz=>{
      addBuilding(b.x+sx*2.5+rr(-.25,.25),b.z+sz*2.5+rr(-.25,.25),rr(3.4,4.4),rr(3.4,4.4),mkH(1),pick(pal));
    }));
  }
});

const bIM=inst(BOXB,bMat,bl.length,true,true);
bl.forEach((b,n)=>setM(bIM,n,b.x,b.y,b.z,b.w,b.h,b.d,0));
setColors(bIM,bl.map(b=>b.col));

// topo: ar-condicionado, antenas, painéis solares
const acIM=inst(BOXB,metalMat,roofUnits.length,true,true);
roofUnits.forEach((u,n)=>setM(acIM,n,u.x,u.y,u.z,1.1*u.s,.6*u.s,.9*u.s,0));
const antGeo=new T.CylinderGeometry(.07,.12,1,6);antGeo.translate(0,.5,0);
const antIM=inst(antGeo,metalMat,antennas.length,true,true);
antennas.forEach((a,n)=>setM(antIM,n,a.x,a.y,a.z,1,a.h,1,0));
const panIM=inst(BOX,panelMat,panels.length,true,true);
panels.forEach((p,n)=>setM(panIM,n,p.x,p.y+.35,p.z,2.2,.06,1.4,0,-.5,0));

// lagos dos parques
ponds.forEach(p=>{
  const m=new T.Mesh(new T.CircleGeometry(p.r,28).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:'#3b8bb8',roughness:.15,metalness:.2}));
  m.position.set(p.x,.14,p.z);m.receiveShadow=true;CITY.add(m);
});

/* ---------- postes, semáforos e árvores de rua ---------- */
const lampPts=[],sigPts=[];
for(let a=0;a<2;a++){
  for(let k=0;k<10;k++){
    const line=rl(k);
    for(let s=-1;s<=1;s+=2){
      for(let pos=-77;pos<=77;pos+=11){
        if(skipNearCross(pos))continue;
        if(a===1&&inRiver(pos))continue;
        lampPts.push({a,line,s,pos});
      }
      for(let pos=-72;pos<=72;pos+=7){
        if(skipNearCross(pos))continue;
        if(a===1&&inRiver(pos))continue;
        if(a===0&&Math.abs(line-ZR)<RHALF+1)continue;
        const sc2=line+s*3.0;
        trees.push(a===0?{x:pos,z:sc2,y:.12,s:rr(.7,.95)}:{x:sc2,z:pos,y:.12,s:rr(.7,.95)});
      }
    }
  }
}
function skipNearCross(pos){
  for(let m=0;m<10;m++)if(Math.abs(pos-rl(m))<RW/2+1.6)return true;
  return false;
}
// intersecções com semáforo
for(let k=0;k<10;k++)for(let m=0;m<10;m++){
  [-1,1].forEach(sx=>[-1,1].forEach(sz=>sigPts.push({x:rl(k)+sx*2.95,z:rl(m)+sz*2.95,ctl:sx*sz>0?0:1})));
}
const poleGeo=new T.CylinderGeometry(.06,.08,3.2,6);poleGeo.translate(0,1.6,0);
const lampPoleIM=inst(poleGeo,darkMat,lampPts.length,true,true);
const lampHeadIM=inst(new T.BoxGeometry(.6,.1,.22),lampHeadMat,lampPts.length,false,false);
const glowIM=inst(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),glowMat,lampPts.length,false,false);
glowIM.renderOrder=2;
lampPts.forEach((l,n)=>{
  const px=l.a===0?l.pos:l.line+l.s*2.65, pz=l.a===0?l.line+l.s*2.65:l.pos;
  const hx=l.a===0?l.pos:l.line+l.s*2.3, hz=l.a===0?l.line+l.s*2.3:l.pos;
  const gx=l.a===0?l.pos:l.line+l.s*1.1, gz=l.a===0?l.line+l.s*1.1:l.pos;
  setM(lampPoleIM,n,px,.12,pz,1,1,1,0);
  setM(lampHeadIM,n,hx,3.32,hz,1,1,1,l.a===0?Math.PI/2:0);
  setM(glowIM,n,gx,.055,gz,7,1,7,0);
});
const sigPoleIM=inst(poleGeo,darkMat,sigPts.length,true,true);
const sigLampGeo=new T.BoxGeometry(.3,.5,.3);
const sigLampIM=inst(sigLampGeo,sigMat,sigPts.length,false,false);
sigPts.forEach((s,n)=>{
  setM(sigPoleIM,n,s.x,.12,s.z,1,.95,1,0);
  setM(sigLampIM,n,s.x,3.2,s.z,1,1,1,0);
});
let sigState=-1;
function setSignals(st){
  if(st===sigState)return;sigState=st;
  const gx=st===0,gz=st===2;
  sigPts.forEach((s,n)=>{
    const green=s.ctl===0?gx:gz;
    _c.set(green?'#38ff7a':(st%2===1?'#ff3b30':'#ff3b30'));
    sigLampIM.setColorAt(n,_c);
  });
  sigLampIM.instanceColor.needsUpdate=true;
}
setSignals(0);

// árvores
(function(){
  for(let i=0;i<260;i++){
    const a=rr(0,Math.PI*2),r=rr(95,200);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(inRiver(z))continue;
    trees.push({x,z,y:0,s:rr(1.5,2.6)});
  }
})();
const trunkGeo=new T.CylinderGeometry(.09,.13,1,5);trunkGeo.translate(0,.5,0);
const leafGeo=new T.IcosahedronGeometry(.85,0);
const trunkIM=inst(trunkGeo,treeTrunkMat,trees.length,true,true);
const leafIM=inst(leafGeo,treeLeafMat,trees.length,true,true);
const leafCols=['#4f8f45','#5da24e','#3f7e3d','#6aa956','#468a4a'];
trees.forEach((t,n)=>{
  setM(trunkIM,n,t.x,t.y,t.z,t.s,t.s*1.0,t.s,0);
  setM(leafIM,n,t.x,t.y+t.s*1.15,t.z,t.s,t.s*1.1,t.s,rr(0,6));
});
setColors(leafIM,trees.map(()=>pick(leafCols)));

/* ---------- torre central e torres de dados ---------- */
const rings=[];
const ringGeo=new T.TorusGeometry(1,.035,8,48);
function addRing(x,y,z,r,speed,tilt){
  const m=new T.Mesh(ringGeo,cyanMat);m.scale.set(r,r,r);m.position.set(x,y,z);m.rotation.x=Math.PI/2+(tilt||0);
  CITY.add(m);rings.push({m,speed,base:tilt||0});
}
const beams=[];
function addBeam(){}
if(centerInfo){
  const c=centerInfo;
  const spire=new T.Mesh(new T.CylinderGeometry(.05,.5,16,8),metalMat);
  spire.position.set(c.x,c.top+8,c.z);spire.castShadow=true;CITY.add(spire);
  [4,8,12].forEach((dy,i)=>addRing(c.x,c.top+dy,c.z,3.2+i*-.5+.8,.8+i*.4,i*.12));
  addBeam(c.x,c.top+16,c.z,120,.45);
  const dome=new T.Mesh(new T.SphereGeometry(1.3,16,12),cyanMat);dome.position.set(c.x,c.top+16.5,c.z);CITY.add(dome);
}
towers.sort((a,b)=>b.y-a.y);
const centerRef=centerInfo;
let tcount=0;
for(const t of towers){
  if(centerRef&&t.x===centerRef.x&&t.z===centerRef.z)continue;
  addRing(t.x,t.y+1.6,t.z,t.w*.85,-.6-R()*.5,0);
  if(tcount<5)addBeam(t.x,t.y+2,t.z,45,.25);
  if(++tcount>=9)break;
}

/* ---------- monotrilho ---------- */
const mono=(function(){
  const h=25.5,r=2.2,c=h-r,Y=11,pts=[];
  const corners=[[c,c,0],[-c,c,Math.PI/2],[-c,-c,Math.PI],[c,-c,Math.PI*1.5]];
  corners.forEach(([cx,cz,a0])=>{
    for(let i=0;i<=4;i++){const a=a0+i/4*Math.PI/2;pts.push(new T.Vector3(cx+r*Math.cos(a),Y,cz+r*Math.sin(a)));}
  });
  const curve=new T.CatmullRomCurve3(pts,true,'centripetal');
  const len=curve.getLength();
  const track=new T.Mesh(new T.TubeGeometry(curve,400,.4,6,true),metalMat);
  track.castShadow=true;track.receiveShadow=true;CITY.add(track);
  const glowTube=new T.Mesh(new T.TubeGeometry(curve,400,.12,5,true),cyanMat);
  glowTube.position.y=-.38;CITY.add(glowTube);
  const np=Math.floor(len/14);
  const pillar=inst(BOXB,whiteMat,np,true,true);
  for(let i=0;i<np;i++){const p=curve.getPointAt(i/np);setM(pillar,i,p.x,0,p.z,.55,Y-.4,.55,0);}
  // estações
  [.1,.35,.6,.85].forEach(u=>{
    const p=curve.getPointAt(u),tg=curve.getTangentAt(u),ry=Math.atan2(-tg.z,tg.x);
    const plat=new T.Mesh(new T.BoxGeometry(9,.35,2.8),whiteMat);plat.position.set(p.x,Y-.75,p.z);plat.rotation.y=ry;plat.castShadow=true;CITY.add(plat);
    const roof=new T.Mesh(new T.BoxGeometry(9,.14,3.2),cyanMat);roof.position.set(p.x,Y+2.1,p.z);roof.rotation.y=ry;CITY.add(roof);
  });
  const NC=6;
  const body=inst(BOX,whiteMat,NC,true,true);
  const stripe=inst(BOX,cyanMat,NC,false,false);
  return {curve,len,NC,body,stripe,u:0};
})();

/* ---------- tráfego ---------- */
const lanes=[],cars=[];
for(let a=0;a<2;a++)for(let k=0;k<10;k++)for(let d=-1;d<=1;d+=2){
  const lane={axis:a,line:rl(k),dir:d,off:d*(a===0?1:-1)*1.15,cars:[]};
  lanes.push(lane);
  for(let n=0;n<4;n++){
    const c={lane,pos:-80+(n+rr(.1,.8))*40,v:0,vmax:rr(7,11),sc:rr(.9,1.25)};
    c.v=c.vmax;lane.cars.push(c);cars.push(c);
  }
}
const carBodyIM=inst(BOX,new T.MeshStandardMaterial({color:0xffffff,roughness:.35,metalness:.5}),cars.length,true,true);
const carCabinIM=inst(BOX,new T.MeshStandardMaterial({color:'#1b2430',roughness:.2,metalness:.6}),cars.length,false,false);
const headIM=inst(BOX,headMat,cars.length,false,false);
const tailIM=inst(BOX,tailMat,cars.length,false,false);
const carCols=['#d33b3b','#2f6fd3','#e8e8e8','#23262b','#e6b422','#2fa36b','#9aa0a6','#8b3fd3','#f08a24'];
setColors(carBodyIM,cars.map(()=>pick(carCols)));
function updateCars(dt,phaseGreen){
  for(let n=0;n<cars.length;n++){
    const c=cars[n],L=c.lane,dv=L.dir;
    let gap=1e9;
    for(let i=0;i<L.cars.length;i++){
      const o=L.cars[i];if(o===c)continue;
      const g=(o.pos-c.pos)*dv;if(g>0&&g<gap)gap=g;
    }
    let stop=1e9;
    for(let m=0;m<10;m++){
      const g=(rl(m)-c.pos)*dv-(RW/2+.8);
      if(g>-.05&&g<stop)stop=g;
    }
    const green=L.axis===0?phaseGreen===0:phaseGreen===2;
    let vt=c.vmax;
    if(!green&&stop<13)vt=Math.min(vt,Math.max(0,stop)*1.1);
    if(gap<10)vt=Math.min(vt,Math.max(0,gap-2.8)*1.4);
    c.v+=clamp(vt-c.v,-16*dt,5*dt);
    c.pos+=c.v*dv*dt;
    if(c.pos*dv>80)c.pos=-80*dv;
    const th=L.axis===0?(dv>0?0:Math.PI):(dv>0?-Math.PI/2:Math.PI/2);
    const fx=Math.cos(th),fz=-Math.sin(th);
    const x=L.axis===0?c.pos:L.line+L.off,z=L.axis===0?L.line+L.off:c.pos;
    const fade=clamp((80-Math.abs(c.pos))/6,0,1),s=c.sc*fade;
    setM(carBodyIM,n,x,.04+.27*s,z,1.55*s,.42*s,.78*s,th);
    setM(carCabinIM,n,x-fx*.1*s,.04+.58*s,z-fz*.1*s,.85*s,.3*s,.7*s,th);
    setM(headIM,n,x+fx*.78*s,.04+.3*s,z+fz*.78*s,.05*s,.1*s,.55*s,th);
    setM(tailIM,n,x-fx*.78*s,.04+.3*s,z-fz*.78*s,.05*s,.1*s,.55*s,th);
  }
  [carBodyIM,carCabinIM,headIM,tailIM].forEach(im=>im.instanceMatrix.needsUpdate=true);
}

/* ---------- drones ---------- */
const ND=30;
const dBody=inst(new T.BoxGeometry(.7,.22,.7),darkMat,ND,true,false);
const dArmA=inst(new T.BoxGeometry(1.6,.07,.1),whiteMat,ND,false,false);
const dArmB=inst(new T.BoxGeometry(.1,.07,1.6),whiteMat,ND,false,false);
const dRot=inst(new T.BoxGeometry(.7,.02,.07),whiteMat,ND*4,false,false);
const dLed=inst(new T.SphereGeometry(.09,6,6),cyanMat,ND,false,false);
const drones=[];
for(let i=0;i<ND;i++){
  if(i<20){
    const bi=ri(0,NB-1),bj=ri(0,NB-1);
    drones.push({type:0,cx:bc(bi),cz:bc(bj),alt:rr(7,17),sp:rr(4,7),s:rr(0,68),ph:rr(0,6)});
  }else{
    drones.push({type:1,r:rr(96,118),alt:rr(24,44),sp:rr(.03,.06)*(R()<.5?-1:1),s:rr(0,6.28),ph:rr(0,6)});
  }
}
function updateDrones(t,dt){
  const S=1.25;
  for(let i=0;i<ND;i++){
    const d=drones[i];let x,y,z,ry;
    if(d.type===0){
      d.s=(d.s+d.sp*dt)%68;
      const seg=Math.floor(d.s/17),u=d.s%17-8.5,h=8.5;
      if(seg===0){x=d.cx+u;z=d.cz-h;ry=0;}
      else if(seg===1){x=d.cx+h;z=d.cz+u;ry=-Math.PI/2;}
      else if(seg===2){x=d.cx-u;z=d.cz+h;ry=Math.PI;}
      else{x=d.cx-h;z=d.cz-u;ry=Math.PI/2;}
      y=d.alt+Math.sin(t*1.7+d.ph)*.6;
    }else{
      d.s+=d.sp*dt;x=Math.cos(d.s)*d.r;z=Math.sin(d.s)*d.r;y=d.alt+Math.sin(t*.9+d.ph)*1.5;
      ry=d.sp>0?-d.s:-d.s+Math.PI;
    }
    setM(dBody,i,x,y,z,S,S,S,ry);
    setM(dArmA,i,x,y+.04,z,S,S,S,ry);
    setM(dArmB,i,x,y+.04,z,S,S,S,ry);
    const cs=Math.cos(ry),sn=Math.sin(ry);
    let k=0;
    for(let sx=-1;sx<=1;sx+=2)for(let sz=-1;sz<=1;sz+=2){
      const lx=sx*.78*S,lz=sz*.78*S;
      setM(dRot,i*4+k,x+lx*cs+lz*sn,y+.14*S,z-lx*sn+lz*cs,S,1,S,t*40+k*1.3+i);
      k++;
    }
    setM(dLed,i,x+Math.cos(ry)*.36*S,y-.02,z-Math.sin(ry)*.36*S,S,S,S,0);
  }
  [dBody,dArmA,dArmB,dRot,dLed].forEach(im=>im.instanceMatrix.needsUpdate=true);
}

/* ---------- sensores IoT (pulsos) ---------- */
const pulses=[];
(function(){
  const sphGeo=new T.SphereGeometry(.18,8,8);
  for(let i=0;i<24;i++){
    const k=ri(0,9),m=ri(0,9);
    const x=rl(k)+(R()<.5?-1:1)*2.95,z=rl(m)+(R()<.5?-1:1)*2.95;
    const node=new T.Mesh(sphGeo,cyanMat);node.position.set(x,3.45,z);CITY.add(node);
    const mat=new T.MeshBasicMaterial({color:'#4de3ff',transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    const ring=new T.Mesh(new T.RingGeometry(.85,1,40).rotateX(-Math.PI/2),mat);
    ring.position.set(x,3.45,z);CITY.add(ring);
    pulses.push({ring,mat,ph:R()});
  }
})();

/* ---------- energia limpa: turbinas e fazenda solar ---------- */
const turbines=[];
(function(){
  const mastGeo=new T.CylinderGeometry(.18,.38,22,8);mastGeo.translate(0,11,0);
  const bladeGeo=new T.BoxGeometry(.32,9,.1);bladeGeo.translate(0,4.7,0);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3+.3,r=118;
    const g=new T.Group();g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
    const mast=new T.Mesh(mastGeo,whiteMat);mast.castShadow=true;g.add(mast);
    const nac=new T.Mesh(new T.BoxGeometry(.7,.7,1.8),whiteMat);nac.position.set(0,22.2,0);g.add(nac);
    const rot=new T.Group();rot.position.set(0,22.2,1.1);
    for(let b=0;b<3;b++){const bl2=new T.Mesh(bladeGeo,whiteMat);bl2.rotation.z=b*Math.PI*2/3;bl2.castShadow=true;rot.add(bl2);}
    g.add(rot);g.rotation.y=Math.PI/2-a;
    CITY.add(g);turbines.push({rot,sp:rr(.7,1.1)});
  }
  const NP=12*7;
  const sf=inst(BOX,panelMat,NP,true,true);
  const post=inst(new T.CylinderGeometry(.06,.06,.9,5),metalMat,NP,false,false);
  let n=0;
  for(let i=0;i<12;i++)for(let j=0;j<7;j++){
    const x=-150+j*3.6,z=-32+i*5.6;
    setM(sf,n,x,.95,z,3,.07,1.9,0,-.55,0);
    setM(post,n,x,.45,z,1,1,1,0);n++;
  }
})();

 /* ===== noite ===== */
 U.uNight.value=.62;lampHeadMat.color.setRGB(1,.9,.62);glowMat.opacity=.7;headMat.color.setRGB(1,.95,.7);tailMat.color.setRGB(1,.08,.08);
 {const g=new T.BufferGeometry(),n=1600,a=new Float32Array(n*3);for(let i=0;i<n;i++){const th=rr(0,Math.PI*2),ph=Math.acos(rr(.02,1)),r=900;a[i*3]=r*Math.sin(ph)*Math.cos(th);a[i*3+1]=r*Math.cos(ph);a[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
  g.setAttribute('position',new T.BufferAttribute(a,3));const p=new T.Points(g,new T.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,transparent:true,opacity:.8,depthWrite:false,fog:false}));p.frustumCulled=false;sceneC.add(p);
  const mo=new T.Mesh(new T.SphereGeometry(14,20,14),new T.MeshBasicMaterial({color:'#dfe8ff',fog:false}));mo.position.set(-300,420,-380);sceneC.add(mo);}
 /* ===== Casa 17 e a vizinhança que ficou ===== */
 const cas=await casaFavela();
 const put=(x,z,r,s,mir)=>{const g=cas.clone(true);g.position.set(x,.12,z);g.rotation.y=r;g.scale.set(s*(mir?-1:1),s,s);CITY.add(g);return g;};
 put(bc(0),bc(7),.05,1.55,false);
 [[-3.4,-3.4,.2,.8,0],[3,-3.2,-.15,.75,1],[-3,3.2,.1,.8,1],[3.4,3,.3,.7,0]].forEach(([dx,dz,r,s,m])=>{put(bc(1)+dx,bc(7)+dz,r,s,m);put(bc(0)+dx,bc(8)+dz,r+.1,s*.95,!m);put(bc(1)+dx,bc(8)+dz,r-.1,s*.9,m);});
 const l17=new T.PointLight(0xffb060,260,50,2);l17.position.set(bc(0),4,bc(7)+4);CITY.add(l17);
 { const pole=(await carregar('electricity-pole')).scene;for(const [x,z] of[[bc(0)+8,bc(7)-6],[bc(0)+8,bc(7)+6],[bc(0)+8,bc(8)+6]]){const p=pole.clone(true);p.traverse(o=>{if(o.isMesh)o.material=new T.MeshStandardMaterial({map:o.material.map,color:0x8d95a8});});p.scale.setScalar(9);p.position.set(x,0,z);CITY.add(p);} }
 /* ===== terreno limpo e tapume ===== */
 { const fence=await (async()=>{const g=(await carregar('construction-fence')).scene;let m;g.traverse(o=>{if(o.isMesh&&!m)m=o;});return m;})();
  const cx=bc(6),cz=bc(2),list=[];for(let k=-6;k<=6;k+=3){list.push([cx+k,cz-6,Math.PI/2],[cx+k,cz+6,Math.PI/2],[cx-6,cz+k,0],[cx+6,cz+k,0]);}
  const im=new T.InstancedMesh(fence.geometry,new T.MeshStandardMaterial({map:fence.material.map,color:0x9aa3b8}),list.length),M=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(10,10,10);
  list.forEach(([x,z,r],i)=>{q.setFromAxisAngle(new T.Vector3(0,1,0),r);M.compose(new T.Vector3(x,.12,z),q,s);im.setMatrixAt(i,M);});CITY.add(im);
  const placa=new T.Mesh(new T.PlaneGeometry(11,3.6),new T.MeshBasicMaterial({map:tex((x,w,h)=>{x.fillStyle='#e8e2d0';x.fillRect(0,0,w,h);x.fillStyle='#10202c';x.font='bold 46px sans-serif';x.fillText('PROJETO CONCLUÍDO',16,70);x.font='22px sans-serif';x.fillText('Reassentamento: ver Anexo 7',20,110);x.fillText('Consórcio Meridiano',20,140);},512,160),side:T.DoubleSide}));placa.position.set(cx,3.2,cz-6.2);CITY.add(placa);
 }
 /* ===== centro de distribuição e painel de vagas (Fase 2) ===== */
 const hm=new T.MeshStandardMaterial({color:0x2a3a50,emissive:0xffffff,emissiveMap:tex((x,w,h)=>{x.fillStyle='#050a12';x.fillRect(0,0,w,h);for(let c=0;c<16;c++){x.fillStyle=c%2?'#7fe8ff':'#ffd27a';x.fillRect(c*16+2,20,12,60);}},256,128),emissiveIntensity:1.3});
 const gb=new T.Mesh(new T.BoxGeometry(11,6,10),hm);gb.position.set(bc(8),3.1,bc(1));CITY.add(gb);
 const hl=new T.PointLight(0x9ff,60,40,2);hl.position.set(bc(8),8,bc(1)+6);CITY.add(hl);
 const bd=new T.Mesh(new T.PlaneGeometry(18,6),new T.MeshBasicMaterial({side:T.DoubleSide,map:tex((x,w,h)=>{x.fillStyle='#0b1a2a';x.fillRect(0,0,w,h);x.strokeStyle='#00e5d8';x.lineWidth=4;x.strokeRect(6,6,w-12,h-12);x.fillStyle='#7dffea';x.font='bold 44px sans-serif';x.fillText('11.400 VAGAS ABERTAS',22,70);x.fillStyle='#cfe';x.font='20px sans-serif';x.fillText('exige comprovante de endereço no cadastro oficial',24,110);},512,150)}));bd.position.set(0,22,rl(5));CITY.add(bd);
 /* ===== animação e pontos de observação ===== */
 let time=0;
 const cityUpd=dt=>{time+=dt;const ph=time%16,sg=ph<6.5?0:ph<8?1:ph<14.5?2:3;setSignals(sg);updateCars(dt,sg);updateDrones(time,dt);
  mono.u=(mono.u+8*dt/mono.len)%1;for(let i=0;i<mono.NC;i++){const u=((mono.u-i*3.5/mono.len)%1+1)%1;const p=mono.curve.getPointAt(u),tg=mono.curve.getTangentAt(u),ry=Math.atan2(-tg.z,tg.x);setM(mono.body,i,p.x,p.y+.95,p.z,3.2,1.2,1.5,ry);setM(mono.stripe,i,p.x,p.y+.8,p.z,3.22,.22,1.52,ry);}
  mono.body.instanceMatrix.needsUpdate=true;mono.stripe.instanceMatrix.needsUpdate=true;
  rings.forEach((r,i)=>{r.m.rotation.z+=r.speed*dt;r.m.rotation.x=Math.PI/2+r.base+Math.sin(time*.7+i)*.08;});
  pulses.forEach(p=>{const f=(time*.45+p.ph)%1;p.ring.scale.setScalar(1+f*6);p.mat.opacity=(1-f)*.7;});
  turbines.forEach(t=>{t.rot.rotation.z+=t.sp*dt;});waterTex.offset.x=(waterTex.offset.x-dt*.012)%1;};
 sceneC.userData.cityUpd=cityUpd;
 const W=(x,y,z)=>new T.Vector3(x*CS,y*CS,z*CS);
 window.CPOS={q1:W(bc(8),5,bc(1)),q3:W(0,5,-6),q4:W(0,22,rl(5)),bikeX:rl(3)*CS,fx:(i,y,k)=>W(bc(i),y,bc(k))};
 hot.push({id:'p1',pos:W(bc(2),22,bc(4)),nome:'Quadra Aurora'},{id:'p2',pos:W(bc(0),6,bc(7)),nome:'Casa 17'},{id:'p3',pos:W(bc(6),5,bc(2)),nome:'Tapume'},{id:'fl',pos:W(0,60,0),nome:'Torre central'});
}
const FLAV={fl:['Torre central','Quase todas as janelas estão acesas e nenhuma silhueta aparece nelas. Segundo o painel, são escritórios de fundos de investimento. Esta observação é só de contexto e não entra no caderno.']};
/* ================= DRONE ================= */
const dr={...DRONE};let dragging=null;
function entrarFeed(sem){modo='feed';dockDrone.visible=false;rp.scene=sceneC;rp.camera=camC;$('#feedui').style.display='block';document.body.classList.add('feed');{let vb=document.getElementById('voltar');if(!vb){vb=document.createElement('button');vb.id='voltar';vb.textContent='Voltar à sala (Esc)';vb.style.cssText='position:absolute;left:14px;bottom:34px;z-index:7;pointer-events:auto;font:inherit;cursor:pointer;color:#9ff;background:rgba(4,12,22,.9);border:1px solid #00e5d8;padding:.4em .8em';vb.onclick=()=>{if(F.on)return;closeUI();sairFeed();};$('#feedui').appendChild(vb);}}
 if(!sem&&!st.dv){st.dv=1;A.ajudaD();}else if(!sem)toast('Drone no ar. H: ajuda de controles.',4000);}
function sairFeed(){if(modo!=='feed')return;modo='sala';dockDrone.visible=true;rp.scene=sceneR;rp.camera=camR;$('#feedui').style.display='none';document.body.classList.remove('feed');$('#marks').innerHTML='';}
let lst;function lista(){if(!lst){lst=document.createElement('div');lst.style.cssText='position:absolute;right:14px;top:14px;display:flex;flex-direction:column;gap:6px;z-index:6;pointer-events:auto;max-width:300px';$('#feedui').appendChild(lst);
  hot.filter(h=>h.f===FASE()).forEach(h=>{const b=document.createElement('button');b.dataset.id=h.id;b.style.cssText='font:inherit;font-size:.85em;text-align:left;cursor:pointer;color:#9ff;background:rgba(4,12,22,.85);border:1px solid #00e5d8;padding:.35em .7em';b.onclick=()=>examinar(h);lst.appendChild(b);});}
 for(const b of lst.children){const h=hot.find(x=>x.id===b.dataset.id),d=h.pos.distanceTo(camC.position),perto=d<=DRONE.alcance;b.style.borderColor=perto?'#7dff9a':'#00e5d8';b.style.color=(st.p[h.id]||st.q[h.id])?'#7a8a9a':perto?'#7dff9a':'#9ff';
  b.textContent=(st.p[h.id]?'✓ ':perto?'● ':'➜ ')+h.nome+' · '+Math.round(d)+' m · '+((st.p[h.id]||st.q[h.id])?'anotado':perto?'PERTO: clique p/ observar':'clique p/ ir até lá')+(h.id==='fl'?' (contexto)':'');}}
function marcadores(){lista();const box=$('#marks');box.style.display=uiOpen?'none':'block';for(const h of hot)if(h.beam)h.beam.visible=h.f===FASE();
 if(!box.children.length)hot.filter(h=>h.f===FASE()).forEach(h=>{const b=document.createElement('button');b.dataset.id=h.id;b.onclick=()=>examinar(h);box.appendChild(b);});
 for(const b of box.children){const h=hot.find(x=>x.id===b.dataset.id),v=h.pos.clone().project(camC),d=h.pos.distanceTo(camC.position);
  const vis=v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;b.style.display=vis?'block':'none';if(!vis)continue;
  b.style.left=((v.x+1)/2*innerWidth)+'px';b.style.top=((1-v.y)/2*innerHeight)+'px';b.className=(d>DRONE.alcance?'far ':'')+((st.p[h.id]||st.q[h.id])?'done':'');
  b.textContent=((st.p[h.id]||st.q[h.id])?'✓ ':d>DRONE.alcance?'➜ ':'● ')+h.nome+(d>DRONE.alcance?' · '+Math.round(d)+' m · clique p/ ir':' · PERTO · clique p/ observar');}}
function examinar(h){const d=h.pos.distanceTo(camC.position);if(d>DRONE.alcance){const c=[[26,0],[-26,0],[0,26],[0,-26]].sort((a,b)=>Math.hypot(h.pos.x+a[0]-dr.x,h.pos.z+a[1]-dr.z)-Math.hypot(h.pos.x+b[0]-dr.x,h.pos.z+b[1]-dr.z))[0];
  const x=h.pos.x+c[0],z=h.pos.z+c[1],y=Math.max(62,h.pos.y+55),dx=h.pos.x-x,dz=h.pos.z-z,hz=Math.hypot(dx,dz);dr.go={x,y,z,h,yaw:Math.atan2(-dx,-dz),pitch:Math.max(-1.25,Math.atan2(h.pos.y-y,hz))};toast('Drone indo até '+h.nome+'. Ao chegar, a observação abre sozinha.',4500);return;}
 if(h.mis&&!st.q[h.id]){ui(`<h2>${h.nome}</h2><p>${h.mis.txt}</p>`+bt('missao','Iniciar a missão de campo',h.id,'on')+bt('close','Voltar ao drone'));return;}
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
 if(v){if(lst)lst.style.display='';sairFeed();if(st.lastf){st.lastf=0;setTimeout(A.final,2200);}toast('Os drones do Consórcio caíram. A transmissão foi preservada e o seu drone voltou para a base.',6000);if(!st.f2&&!st.b1){st.b1=1;setTimeout(()=>ui(`<h2 style="color:#ff4fd8">Reforço por terra</h2><p>Os drones caíram, mas o Consórcio não aceita o sinal perdido. A porta de serviço se abre. A Aranha de Obra entra, e atrás dela vêm protocolos: autômatos enfaixados em papel timbrado, andando em fila.</p>`+bt('boss','Encarar a Aranha','','on')+bt('close','Esperar')),2500);}if(nP()>=0)st.fim=st.fim||0;upObj();}
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
A.gato=()=>{const al=hot.filter(h=>h.f===FASE()&&!(st.p[h.id]||st.q[h.id])).map(h=>h.nome);
 ui(`<h2>Bit</h2><p class="sm">gato-robô · ronrona em 440 Hz</p><p>${st.feed?(al.length?'Alvos ainda sem registro: '+al.join(', ')+'. Pelo drone, clica no nome na lista e ele vai sozinho.':'Todos os alvos desta fase já estão no caderno. Falta decidir no certificado.'):'Bateria do drone: 100%. Sinal estável. Recomendo o terminal, a mesa da direita.'}</p><p class="sm">Se ele fizer miau de alerta, tem algo vindo.</p>`+bt('close','Fechar'));};
/* ===== BATALHA CONTRA A ARANHA DE OBRA ===== */
const Bo={mu:[],mt:6,mk:null,on:0,hp:600,max:600,ph:100,sh:0,m:null,p:new THREE.Vector3(13,0,3.5),att:null,cd:2,stun:0,fire:0,tele:[],proj:[],pick:null,pt:0,res:0,hud:null,say:0,half:0};
const bossMsg=(m)=>{if(Bo.say<0.01){toast(m,2200);Bo.say=3;}};
function hurt(d){if(Bo.sh){Bo.sh=0;toast('O escudo absorveu o golpe.',1500);return;}Bo.ph-=d;}
async function startBoss(){closeUI();
 for(const x of Bo.tele)sceneR.remove(x.m);for(const x of Bo.proj)sceneR.remove(x.m);if(Bo.m)sceneR.remove(Bo.m);if(Bo.pick)sceneR.remove(Bo.pick);
 for(const u of Bo.mu)sceneR.remove(u.m);Bo.mu=[];Bo.mt=6;Bo.mk=(await carregar('Mumia')).scene;
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
A.bossfugir=()=>{closeUI();};
function bossEnd(v){Bo.on=0;for(const u of Bo.mu)sceneR.remove(u.m);Bo.mu=[];Bo.hud.style.display='none';for(const x of Bo.tele)sceneR.remove(x.m);for(const x of Bo.proj)sceneR.remove(x.m);Bo.tele=[];Bo.proj=[];if(Bo.pick){sceneR.remove(Bo.pick);Bo.pick=null;}
 if(v){const m=Bo.m;Bo.m=null;sceneR.remove(m);toast(Bo.kind&&Bo.kind!=='ar'?Bo.win:'A Aranha desabou. Iara: "Anota isso no relatório."',7000);}
 else{ui(`<h2 style="color:#ff4fd8">Derrubada</h2><p>A Aranha te encurrala perto da porta e as páginas se espalham pelo chão.</p>`+bt('bossgo','Tentar de novo','','on')+bt('bossfugir','Desistir'));}}
function mum(){const g=Bo.mk.clone(true);g.traverse(o=>{if(o.isMesh){o.castShadow=true;const m=o.material=o.material.clone();m.emissive=new THREE.Color(0xffffff);m.emissiveMap=m.map;m.emissiveIntensity=.25;m.metalness=0;m.roughness=.9;}});g.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(g);const k=1.7/b.getSize(new THREE.Vector3()).y;g.scale.multiplyScalar(k);g.updateMatrixWorld(true);b.setFromObject(g);const c=b.getCenter(new THREE.Vector3());g.position.set(-c.x,-b.min.y,-c.z);const w=new THREE.Group();w.add(g);return w;}
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
   else{const c=[{x:pl.x,z:pl.y}];if(Bo.half)c.push({x:pl.x+(Math.random()*4-2),z:pl.y+(Math.random()*3-1.5)});if(Bo.kind&&Bo.kind!=='ar')for(let i=0;i<3;i++)c.push({x:pl.x+(Math.random()*8-4),z:pl.y+(Math.random()*5-2.5)});c.forEach(q=>q.m=ring(q.x,q.z,2.3));Bo.att={k:'slam',t:0,c};bossMsg('Bit: sai do círculo vermelho!');}}}
 Bo.p.x=Math.max(1,Math.min(15,Bo.p.x));Bo.p.z=Math.max(.9,Math.min(6.1,Bo.p.z));
 Bo.m.position.set(Bo.p.x,Math.sin(t*9)*.04,Bo.p.z);Bo.m.rotation.y=Math.atan2(d.x,d.z);if(Bo.kind==='mod')modAnim(t);if(Bo.kind==='cred')credAnim(t);
 /* tiro do jogador */
 if(!uiOpen&&keys[' ']&&Bo.fire<=0){Bo.fire=.35;const m=new THREE.Mesh(new THREE.BoxGeometry(.3,.03,.4),new THREE.MeshBasicMaterial({color:0xfff1b0}));m.position.set(pl.x,1.1,pl.y);sceneR.add(m);Bo.proj.push({m,v:Bo.p.clone().setY(1).sub(m.position).normalize().multiplyScalar(18),t:2});}
 for(const q of Bo.proj){q.t-=dt;q.m.position.addScaledVector(q.v,dt);q.m.rotation.y+=dt*14;if(q.m.position.distanceTo(new THREE.Vector3(Bo.p.x,1,Bo.p.z))<1.8){Bo.hp-=(10+2*(nP()+nQ()))*(Bo.stun>0?2:1);q.t=0;}for(const u of Bo.mu)if(q.t>0&&q.m.position.distanceTo(new THREE.Vector3(u.m.position.x,1,u.m.position.z))<1){u.hp-=10+2*(nP()+nQ());q.t=0;}}
 for(let i=Bo.proj.length-1;i>=0;i--)if(Bo.proj[i].t<=0){sceneR.remove(Bo.proj[i].m);Bo.proj.splice(i,1);}
 /* protocolos (múmias de papel) */
 Bo.mt-=dt;if(Bo.mt<=0&&Bo.mu.length<3){Bo.mt=9;const m=mum();m.position.set(15,0,1+Math.random()*5);sceneR.add(m);Bo.mu.push({m,hp:20,cd:0});bossMsg('Iara: protocolos! Eles não param de andar.');}
 for(const u of Bo.mu){const dx=pl.x-u.m.position.x,dz=pl.y-u.m.position.z,l=Math.hypot(dx,dz)||1;u.m.position.x+=dx/l*1.15*dt;u.m.position.z+=dz/l*1.15*dt;u.m.rotation.y=Math.atan2(dx,dz);u.m.position.y=Math.abs(Math.sin(t*6+u.hp))*.03;u.cd-=dt;if(l<.9&&u.cd<=0){u.cd=1.2;hurt(8);}}
 Bo.mu=Bo.mu.filter(u=>{if(u.hp<=0){sceneR.remove(u.m);return false;}return true;});
 /* escudo */
 if(Bo.pick){if(Bo.pick.visible){Bo.pick.rotation.y+=dt*2;Bo.pick.position.y=.8+Math.sin(t*3)*.1;if(Math.hypot(pl.x-Bo.pick.position.x,pl.y-Bo.pick.position.z)<.9){Bo.sh=1;Bo.pick.visible=false;Bo.pt=16;toast('Escudo pego. Ele absorve um golpe.',2000);}}
  else if(!Bo.sh){Bo.pt-=dt;if(Bo.pt<=0){Bo.pick.position.set(2+Math.random()*12,.8,1+Math.random()*5);Bo.pick.visible=true;}}}
 const bar=(h,m,c)=>`<span style="display:inline-block;width:110px;height:8px;background:#10182a;border:1px solid ${c};vertical-align:middle"><i style="display:block;height:100%;width:${Math.max(0,h/m*100)}%;background:${c}"></i></span>`;
 Bo.hud.innerHTML=`<b style="color:#00e5d8">VOCÊ</b> ${bar(Bo.ph,100,'#00e5d8')} ${Math.max(0,Math.round(Bo.ph))} &nbsp;|&nbsp; <b style="color:#ff4fd8">${Bo.nome||'ARANHA'}</b> ${bar(Bo.hp,Bo.max,'#ff4fd8')} ${Bo.stun>0?'<b style="color:#ffb13b">TONTA</b>':''} &nbsp;|&nbsp; Escudo: ${Bo.sh?'<b style="color:#7dff9a">ativo</b>':'não'} &nbsp;|&nbsp; Espaço: lançar página`;
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
function moderador(){const T=THREE;let seed=4242;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;const rr=(a,b)=>a+R()*(b-a);const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};const accent=new T.Color('#3ff2ff'),MAG=new T.Color('#ff2bd6');
/* ---------- texturas ---------- */
function panelTex(){
  const [c,x]=mk(512,512);
  x.fillStyle='#262a38';x.fillRect(0,0,512,512);
  for(let i=0;i<5000;i++){x.fillStyle=R()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.12)';x.fillRect(R()*512,R()*512,2,2);}
  x.strokeStyle='rgba(0,0,0,.65)';x.lineWidth=3;
  for(let i=0;i<=4;i++){x.beginPath();x.moveTo(0,i*128);x.lineTo(512,i*128);x.stroke();x.beginPath();x.moveTo(i*128,0);x.lineTo(i*128,512);x.stroke();}
  x.strokeStyle='rgba(255,255,255,.1)';x.lineWidth=1;
  for(let i=0;i<=4;i++){x.beginPath();x.moveTo(0,i*128+3);x.lineTo(512,i*128+3);x.stroke();}
  x.fillStyle='rgba(0,0,0,.55)';
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){[[10,10],[118,10],[10,118],[118,118]].forEach(p=>{x.beginPath();x.arc(i*128+p[0],j*128+p[1],3,0,7);x.fill();});}
  for(let k=0;k<5;k++){const vx=rr(20,400),vy=rr(20,420);x.fillStyle='rgba(0,0,0,.5)';for(let s=0;s<6;s++)x.fillRect(vx,vy+s*8,70,4);}
  return c;
}
function hazardTex(){
  const [c,x]=mk(256,32);
  x.fillStyle='#111';x.fillRect(0,0,256,32);
  x.fillStyle='#f2c230';
  for(let i=-2;i<12;i++){x.beginPath();x.moveTo(i*32,32);x.lineTo(i*32+16,32);x.lineTo(i*32+32,0);x.lineTo(i*32+16,0);x.fill();}
  return c;
}
function hexTex(){
  const [c,x]=mk(480,554);
  x.fillStyle='#0b0818';x.fillRect(0,0,480,554);
  const s=40,hh=Math.sqrt(3)*s;
  for(let col=-1;col<=9;col++)for(let row=-1;row<=9;row++){
    const cx=col*60,cy=row*hh+(((col%2)+2)%2?hh/2:0);
    x.beginPath();
    for(let k=0;k<6;k++){const a=k*Math.PI/3;const px=cx+s*Math.cos(a),py=cy+s*Math.sin(a);k?x.lineTo(px,py):x.moveTo(px,py);}
    x.closePath();
    if(R()<.08){x.fillStyle='rgba(63,242,255,.13)';x.fill();}
    else if(R()<.05){x.fillStyle='rgba(255,43,214,.12)';x.fill();}
    x.strokeStyle='rgba(120,150,255,.28)';x.lineWidth=2;x.stroke();
  }
  return c;
}
function T2(c,rx,ry){
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;
  t.anisotropy=4;
  if(rx)t.repeat.set(rx,ry||rx);return t;
}

/* ---------- materiais ---------- */
const metal=new T.MeshStandardMaterial({color:'#9aa0b8',map:T2(panelTex(),1,1),roughness:.45,metalness:.75});
const metalDark=new T.MeshStandardMaterial({color:'#1c1f2b',roughness:.5,metalness:.8});
const metalMid=new T.MeshStandardMaterial({color:'#3a3f55',roughness:.4,metalness:.85});
const hazard=new T.MeshStandardMaterial({map:T2(hazardTex(),3,1),roughness:.6,metalness:.3});
const coneMat=new T.MeshStandardMaterial({color:'#15171f',roughness:.8,metalness:.2,side:T.DoubleSide});
const ledMat=new T.MeshBasicMaterial({color:accent,toneMapped:false});
const magMat=new T.MeshBasicMaterial({color:MAG,toneMapped:false});
const redMat=new T.MeshBasicMaterial({color:'#ff2a2a',toneMapped:false});
const boss=new T.Group();
const rig=new T.Group();boss.add(rig);          // balanço / tremor
function add(parent,geo,mat,x,y,z,opts){
  const m=new T.Mesh(geo,mat);m.position.set(x,y,z);
  m.castShadow=!(opts&&opts.noShadow);m.receiveShadow=true;parent.add(m);return m;
}
// plinto
add(boss,new T.CylinderGeometry(3.3,3.7,.5,8),metalDark,0,.25,0);
const plRing=add(boss,new T.TorusGeometry(3.45,.07,8,64).rotateX(Math.PI/2),ledMat,0,.52,0,{noShadow:true});
add(boss,new T.CylinderGeometry(2.9,3.1,.12,8),metalMid,0,.56,0);

// cabine de som (corpo)
const BODY_Y=.5;
add(rig,new T.BoxGeometry(3.2,3.0,2.2),metal,0,BODY_Y+1.5,0);
add(rig,new T.BoxGeometry(3.28,.28,2.28),hazard,0,BODY_Y+.3,0);
add(rig,new T.BoxGeometry(3.4,.2,2.4),metalDark,0,BODY_Y+3.05,0);
// tiras de LED nas quinas verticais
const edgeLeds=[];
[[-1.62,1.12],[1.62,1.12],[-1.62,-1.12],[1.62,-1.12]].forEach(p=>{
  edgeLeds.push(add(rig,new T.BoxGeometry(.06,2.4,.06),ledMat,p[0],BODY_Y+1.75,p[1],{noShadow:true}));
});
// caixas de som (frente)
const speakers=[];
function speaker(parent,x,y,z,r,ry){
  const g=new T.Group();g.position.set(x,y,z);if(ry)g.rotation.y=ry;parent.add(g);
  add(g,new T.TorusGeometry(r,r*.12,10,40),metalDark,0,0,.02);
  add(g,new T.CylinderGeometry(r*1.18,r*1.18,.12,32).rotateX(Math.PI/2),metalDark,0,0,-.03);
  const cone=add(g,new T.CylinderGeometry(r*.97,r*.3,r*.55,40,1,true).rotateX(Math.PI/2),coneMat,0,0,-r*.12,{noShadow:true});
  const cap=add(g,new T.SphereGeometry(r*.3,16,10,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI/2),metalMid,0,0,-r*.1,{noShadow:true});
  const ringLed=add(g,new T.TorusGeometry(r*.62,.015,6,40),magMat,0,0,-r*.06,{noShadow:true});
  speakers.push({g,cone,cap,r,ringLed,base:cone.position.z,capBase:cap.position.z});
  return g;
}
const FZ=1.12;
speaker(rig,-.82,BODY_Y+1.0,FZ,.66);speaker(rig,.82,BODY_Y+1.0,FZ,.66);
speaker(rig,-.82,BODY_Y+2.15,FZ,.44);speaker(rig,.82,BODY_Y+2.15,FZ,.44);
speaker(rig,-.82,BODY_Y+2.7,FZ,.2);speaker(rig,.82,BODY_Y+2.7,FZ,.2);
// medidor VU central
const vu=[];
for(let i=0;i<12;i++){
  const m=new T.MeshBasicMaterial({color:'#222',toneMapped:false});
  add(rig,new T.BoxGeometry(.22,.1,.05),m,0,BODY_Y+.75+i*.19,FZ+.01,{noShadow:true});
  vu.push(m);
}
// caixas laterais (fileiras)
[-1,1].forEach(s=>{
  const g=new T.Group();g.position.set(s*1.62,BODY_Y+1.6,0);g.rotation.y=s*Math.PI/2;rig.add(g);
  const sp=[[0,.7,.5],[0,-.4,.62]];
  sp.forEach(p=>{
    const sg=new T.Group();sg.position.set(0,p[1],0.0);g.add(sg);
    const r=p[2]*.8;
    add(sg,new T.TorusGeometry(r,r*.12,8,32),metalDark,0,0,.02);
    const cone=add(sg,new T.CylinderGeometry(r*.97,r*.3,r*.55,32,1,true).rotateX(Math.PI/2),coneMat,0,0,-r*.12,{noShadow:true});
    speakers.push({g:sg,cone,cap:null,r,ringLed:null,base:cone.position.z,capBase:0});
  });
});

// pescoço
add(rig,new T.BoxGeometry(1.6,.95,1.2),metalMid,0,BODY_Y+3.55,0);
add(rig,new T.BoxGeometry(2.4,.2,1.6),metalDark,0,BODY_Y+3.12,0);

// cabeça-tela
const head=new T.Group();head.position.set(0,6.05,0);head.scale.setScalar(1.2);rig.add(head);
add(head,new T.BoxGeometry(3.9,2.7,1.0),metal,0,0,0);
add(head,new T.BoxGeometry(4.05,.14,1.1),metalDark,0,1.38,0);
add(head,new T.BoxGeometry(4.05,.14,1.1),metalDark,0,-1.38,0);
[[-1],[1]].forEach(([s])=>{
  add(head,new T.BoxGeometry(.07,2.45,.07),ledMat,s*1.88,0,.52,{noShadow:true});
});
add(head,new T.BoxGeometry(3.6,.07,.07),ledMat,0,1.2,.52,{noShadow:true});
add(head,new T.BoxGeometry(3.6,.07,.07),magMat,0,-1.2,.52,{noShadow:true});
// tela animada
const SW=1024,SH=704;
const [scv,sx]=mk(SW,SH);
const screenTex=new T.CanvasTexture(scv);screenTex.colorSpace=T.SRGBColorSpace;screenTex.anisotropy=8;
const screen=new T.Mesh(new T.PlaneGeometry(3.5,2.4),new T.MeshBasicMaterial({map:screenTex,toneMapped:false}));
screen.position.set(0,0,.505);head.add(screen);
// scanlines
const [slc,slx]=mk(SW,SH);
for(let y=0;y<SH;y+=4){slx.fillStyle='rgba(0,0,0,.22)';slx.fillRect(0,y,SW,2);}
// alto-falantes de ouvido
[-1,1].forEach(s=>{
  const g=new T.Group();g.position.set(s*2.2,0,0);g.rotation.y=s*Math.PI/2;head.add(g);
  add(g,new T.CylinderGeometry(.8,.8,.32,32).rotateX(Math.PI/2),metalDark,0,0,-.02);
  const cone=add(g,new T.CylinderGeometry(.66,.2,.3,32,1,true).rotateX(Math.PI/2),coneMat,0,0,.1,{noShadow:true});
  add(g,new T.TorusGeometry(.7,.05,8,32),magMat,0,0,.17,{noShadow:true});
  speakers.push({g,cone,cap:null,r:.7,ringLed:null,base:cone.position.z,capBase:0});
});
// cornetas
function horn(s){
  const g=new T.Group();g.position.set(s*1.25,1.55,-.1);g.rotation.set(.95,0,-s*.25);head.add(g);
  add(g,new T.CylinderGeometry(.32,.32,.5,16),metalDark,0,.25,0);
  add(g,new T.CylinderGeometry(.62,.2,1.1,24,1,true),coneMat,0,1.0,0,{noShadow:true});
  add(g,new T.TorusGeometry(.62,.05,8,24).rotateX(Math.PI/2),ledMat,0,1.55,0,{noShadow:true});
}
horn(-1);horn(1);
// sirene
add(head,new T.CylinderGeometry(.36,.45,.22,20),metalDark,0,1.56,0);
const lens=add(head,new T.CylinderGeometry(.26,.3,.34,20),redMat,0,1.84,0,{noShadow:true});
const beamG=new T.ConeGeometry(1.3,8,24,1,true);beamG.translate(0,-4,0);beamG.rotateZ(Math.PI/2);
const beamMat=new T.MeshBasicMaterial({color:'#ff2a2a',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});
const siren=new T.Group();siren.position.set(0,1.84,0);head.add(siren);
const beam=new T.Mesh(beamG,beamMat);beam.raycast=()=>{};siren.add(beam);
const beam2=new T.Mesh(beamG,beamMat);beam2.rotation.y=Math.PI;beam2.raycast=()=>{};siren.add(beam2);
// antena
add(head,new T.CylinderGeometry(.03,.03,1.5,6),metalMid,-1.7,1.95,-.3);
const antTip=add(head,new T.SphereGeometry(.09,8,8),magMat,-1.7,2.72,-.3,{noShadow:true});

// ombros e braços-martelo (banhammer)
const arms=[];
[-1,1].forEach(s=>{
  const sh=new T.Group();sh.position.set(s*2.55,BODY_Y+2.55,0);rig.add(sh);
  add(sh,new T.SphereGeometry(.5,20,16),metalMid,0,0,0);
  add(sh,new T.TorusGeometry(.52,.05,8,32),magMat,0,0,0,{noShadow:true}).rotation.y=Math.PI/2;
  const pivot=new T.Group();sh.add(pivot);
  add(pivot,new T.BoxGeometry(.55,1.4,.55),metalDark,0,.7,0);
  add(pivot,new T.CylinderGeometry(.17,.2,2.5,12),metalMid,0,2.35,0);
  add(pivot,new T.TorusGeometry(.24,.04,6,16).rotateX(Math.PI/2),ledMat,0,1.55,0,{noShadow:true});
  const hd=new T.Group();hd.position.set(0,4.0,0);pivot.add(hd);
  add(hd,new T.CylinderGeometry(.58,.58,1.7,28).rotateZ(Math.PI/2),metal,0,0,0);
  [-1,1].forEach(e=>{
    add(hd,new T.CylinderGeometry(.64,.64,.2,28).rotateZ(Math.PI/2),metalDark,e*.9,0,0);
    add(hd,new T.TorusGeometry(.6,.045,8,32).rotateY(Math.PI/2),magMat,e*.66,0,0,{noShadow:true});
  });
  arms.push({s,sh,pivot,hd,t:-1,hit:false,idle:.12});
});

// torretas de ombro
const turrets=[];
[-1,1].forEach(s=>{
  const g=new T.Group();g.position.set(s*1.15,BODY_Y+3.15+.1,-.55);rig.add(g);
  add(g,new T.CylinderGeometry(.42,.5,.28,16),metalDark,0,.14,0);
  const th=new T.Group();th.position.set(0,.5,0);g.add(th);
  add(th,new T.BoxGeometry(.8,.55,.9),metalMid,0,0,0);
  add(th,new T.SphereGeometry(.2,12,10),ledMat,0,.32,-.1,{noShadow:true});
  const barrels=[];
  [-1,1].forEach(b=>{
    const brl=add(th,new T.CylinderGeometry(.075,.09,1.3,10).rotateX(Math.PI/2),metalDark,b*.22,0,.95);
    add(th,new T.CylinderGeometry(.11,.11,.14,10).rotateX(Math.PI/2),ledMat,b*.22,0,1.6,{noShadow:true});
    barrels.push(brl);
  });
  turrets.push({g,th,barrels,recoil:0});
});

return {boss,rig,head,arms,turrets,speakers,edgeLeds,vu,sx,scv,screenTex,SW,SH};}

/*
 * pessoas.js — pessoas low-poly procedurais para Three.js (r128+; testado em r147)
 * ------------------------------------------------------------------------------
 * Convenções
 *   - Unidades em metros. Adulto ~1,75 m com escala 1. Frente = +Z. Cima = +Y.
 *   - "E" = esquerda da pessoa (+X), "D" = direita (-X).
 *   - Geometrias são compartilhadas entre todas as pessoas (cache por THREE);
 *     cada pessoa tem os próprios materiais (cor/trocas independentes).
 *   - ~700 triângulos por pessoa (≈ 25–30 meshes), sem texturas.
 *
 * Uso rápido
 *   const p = Pessoas.criar(THREE, { tipo: 'entregador' });
 *   scene.add(p.grupo);
 *   // no loop:
 *   Pessoas.animar(p, tempo, dt, { pose: 'andar', velocidade: 1.3 });
 *
 *   Pessoas.atualizarCores(p, { blusa: 0xff0000, calca: 0x223344 });
 *   const clone = Pessoas.clonar(THREE, p, { escala: 1.05, cores: { blusa: 0x00aa55 } });
 *   const gente = Pessoas.aleatoria(THREE, 'morador', Pessoas.rng(42));
 *
 * Tipos:  base | entregador | faixineira | morador | executivo | seguranca
 * Poses:  parado | andar | correr | sentado | caixa | celular | pedalar | moto
 *
 * Opções de criar(): ver o objeto DEFAULTS e PERFIS abaixo (tudo sobrescrevível).
 */
/* versão ES module: import Pessoas from './pessoas.mjs'; */
const factory = function () {
'use strict';

const PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/* ---------------------------------------------------------------- paletas */
const PELES = [0xf3d0b0, 0xe6b88f, 0xcf9468, 0xad7048, 0x82502f, 0x5a3622];
const CABELOS = [0x15100d, 0x2b1b12, 0x4b3220, 0x7b5a38, 0xb9b2a6];
const ROUPA_VIVA = [0xd94f3d, 0x3d7fd9, 0x3da66a, 0xe0b030, 0x8a5cc2, 0xe07a9a, 0x2f9aa6, 0xf08a3a];
const ROUPA_NEUTRA = [0x2c3138, 0x55606d, 0x8a7a66, 0xd8d3c8, 0x3b4a6b, 0x6b3d3d];
const JEANS = [0x2f4466, 0x3c5683, 0x1f2a3d, 0x4a5a73];

/* ---------------------------------------------------------------- padrões */
const DEFAULTS = {
  tipo: 'base', genero: 'f', idade: 'adulto',
  escala: 1, altura: 1, corpulencia: 1,
  pele: 0xcf9468, cabelo: 0x2b1b12, estiloCabelo: 'curto', // curto|crespo|longo|coque|trancas|careca
  cores: { blusa: 0x55606d, calca: 0x2f4466, sapato: 0x222222, acento: 0xd94f3d },
  manga: 'curta',            // curta | longa
  calcaTipo: 'longa',        // longa | bermuda
  chapeu: 'nenhum',          // nenhum | bone | capacete | touca
  acessorios: [],            // mochila avental colete gravata balde rodo sacola maleta radio
  veiculo: 'a_pe',           // a_pe | bike | moto   (só define a pose padrão)
  filho: false,              // morador: cria criança de mão dada
  pose: 'parado',
  material: 'standard',      // standard (facetado) | lambert (mais leve) | basic
  rosto: true,
  geom: null                 // geometria do veículo (ver GEOM_*)
};
const PERFIS = {
  base: {},
  entregador: { genero: 'm', cores: { blusa: 0x2b2f36, calca: 0x1f2a3d, sapato: 0x1a1a1a, acento: 0xe8472b },
    chapeu: 'capacete', acessorios: ['mochila'], veiculo: 'bike', estiloCabelo: 'curto', manga: 'curta' },
  faxineira: { genero: 'f', cores: { blusa: 0x4f9fd1, calca: 0x2f3f5a, sapato: 0xe8e8e8, acento: 0xf2f2f2 },
    chapeu: 'touca', acessorios: ['avental', 'balde'], estiloCabelo: 'coque', manga: 'curta' },
  morador: { genero: 'f', cores: { blusa: 0xd94f3d, calca: 0x3c5683, sapato: 0x5a4636, acento: 0xe0b030 },
    acessorios: ['sacola'], estiloCabelo: 'crespo' },
  executivo: { genero: 'm', cores: { blusa: 0x25304a, calca: 0x25304a, sapato: 0x101010, acento: 0xa8283a },
    acessorios: ['gravata', 'maleta'], manga: 'longa', estiloCabelo: 'curto' },
  seguranca: { genero: 'm', cores: { blusa: 0xe8e8e8, calca: 0x1d2128, sapato: 0x101010, acento: 0xc8e63a },
    chapeu: 'bone', acessorios: ['colete', 'radio'], manga: 'curta', estiloCabelo: 'careca' }
};
/* geometria do veículo no referencial do quadril (z frente, y cima) */
const GEOM_BIKE = { cz: 0.2, cy: -0.65, r: 0.16, bz: 0.52, by: 0.05 };
const GEOM_MOTO = { pz: 0.34, py: -0.5, bz: 0.6, by: 0.16 };

/* ------------------------------------------------------------------ rng */
function rng(seed) { /* mulberry32 */
  let a = (seed >>> 0) || 1;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* --------------------------------------------------------------- geometrias */
const cache = new WeakMap();
function geos(T) {
  let g = cache.get(T); if (g) return g;
  g = {
    box: new T.BoxGeometry(1, 1, 1),
    membro: new T.CylinderGeometry(1, 0.72, 1, 5, 1).translate(0, -0.5, 0),      /* topo em y=0, desce */
    torso: new T.CylinderGeometry(1, 0.8, 1, 8, 1).translate(0, 0.5, 0),          /* base em y=0, sobe */
    pelve: new T.CylinderGeometry(0.88, 1, 1, 8, 1),
    esf: new T.SphereGeometry(1, 6, 4),
    cabeca: new T.SphereGeometry(1, 8, 6),
    pesc: new T.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0),
    hemi: new T.SphereGeometry(1, 8, 4, 0, PI * 2, 0, PI / 2),
    cil: new T.CylinderGeometry(1, 1, 1, 8, 1),
    balde: new T.CylinderGeometry(1, 0.78, 1, 8, 1),
    pe: new T.BoxGeometry(1, 1, 1).translate(0, -0.5, 0.3)
  };
  cache.set(T, g); return g;
}

/* --------------------------------------------------------------- materiais */
function mkMat(T, kind, c, rough) {
  if (kind === 'lambert') return new T.MeshLambertMaterial({ color: c });
  if (kind === 'basic') return new T.MeshBasicMaterial({ color: c });
  return new T.MeshStandardMaterial({ color: c, roughness: rough == null ? 0.85 : rough, metalness: 0, flatShading: true });
}

/* ------------------------------------------------------- resolver opções */
function resolver(op) {
  op = op || {};
  const tipo = op.tipo || 'base';
  const pf = PERFIS[tipo] || {};
  const o = Object.assign({}, DEFAULTS, pf, op);
  o.cores = Object.assign({}, DEFAULTS.cores, pf.cores || {}, op.cores || {});
  o.tipo = tipo;
  if (op.pose == null) o.pose = o.veiculo === 'bike' ? 'pedalar' : o.veiculo === 'moto' ? 'moto' : (pf.pose || 'parado');
  if (o.veiculo === 'a_pe' && (o.pose === 'pedalar' || o.pose === 'moto')) o.pose = 'parado';
  return o;
}

/* =================================================================== CRIAR */
function criar(T, op) {
  const o = resolver(op);
  const G = geos(T);
  const kid = o.idade === 'crianca';
  const K = kid ? { p: 0.78, t: 0.9, c: 1.38, b: 0.82, l: 0.9 } : { p: 1, t: 1, c: 1, b: 1, l: 1 };
  const fem = o.genero === 'f';
  const corp = o.corpulencia, alt = o.altura;
  const larg = (fem ? 0.93 : 1.06) * K.l * corp;
  const quad = (fem ? 1.1 : 0.96) * K.l * corp;
  const D = {
    L1: 0.43 * K.p * alt, L2: 0.43 * K.p * alt, pe: 0.07 * K.p * alt,
    torso: 0.5 * K.t * alt, A1: 0.29 * K.b * alt, A2: 0.27 * K.b * alt,
    sw: 0.2 * larg, hw: 0.095 * quad, cab: 0.115 * K.c, pesc: 0.07, corp
  };
  D.quadH = D.L1 + D.L2 + D.pe;
  D.alturaTotal = (D.quadH + 0.07 + D.torso + D.pesc + D.cab * 2) * o.escala;

  const mat = {
    pele: mkMat(T, o.material, o.pele), cabelo: mkMat(T, o.material, o.cabelo),
    blusa: mkMat(T, o.material, o.cores.blusa), calca: mkMat(T, o.material, o.cores.calca),
    sapato: mkMat(T, o.material, o.cores.sapato, 0.6), acento: mkMat(T, o.material, o.cores.acento),
    extra: mkMat(T, o.material, 0xe9e9e4), olho: mkMat(T, o.material, 0x15100d),
    papelao: mkMat(T, o.material, 0xb88a56)
  };
  const mesh = (geo, m, par, sx, sy, sz, x, y, z) => {
    const me = new T.Mesh(geo, m); me.scale.set(sx, sy, sz); me.position.set(x || 0, y || 0, z || 0);
    if (par) par.add(me); return me;
  };
  const grp = (par, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (par) par.add(g); return g; };

  const grupo = new T.Group(); grupo.scale.setScalar(o.escala);
  const corpo = grp(grupo, 0, D.quadH, 0);
  mesh(G.pelve, mat.calca, corpo, D.hw * 2.05, 0.17, 0.125 * corp * K.l, 0, 0.0, 0);

  /* pernas */
  const pernaPele = o.calcaTipo === 'bermuda';
  const pernas = [];
  [1, -1].forEach((s) => {
    const coxa = grp(corpo, s * D.hw, 0, 0);
    mesh(G.membro, mat.calca, coxa, 0.085 * corp * K.l, D.L1, 0.085 * corp * K.l);
    const joelho = grp(coxa, 0, -D.L1, 0);
    mesh(G.membro, pernaPele ? mat.pele : mat.calca, joelho, 0.062 * corp * K.l, D.L2, 0.062 * corp * K.l);
    const pe = grp(joelho, 0, -D.L2, 0);
    mesh(G.pe, mat.sapato, pe, 0.1 * K.l, D.pe, 0.27 * K.p);
    pernas.push({ coxa, joelho, pe });
  });

  /* tronco */
  const tronco = grp(corpo, 0, 0.07, 0);
  const torsoMesh = mesh(G.torso, mat.blusa, tronco, D.sw * 1.12, D.torso, 0.13 * corp * K.l);
  const ombY = D.torso - 0.07;
  const bracos = [];
  [1, -1].forEach((s) => {
    const ombro = grp(tronco, s * D.sw, ombY, 0);
    mesh(G.esf, mat.blusa, ombro, 0.06 * corp * K.b, 0.06 * corp * K.b, 0.06 * corp * K.b);
    mesh(G.membro, mat.blusa, ombro, 0.052 * corp * K.b, D.A1, 0.052 * corp * K.b);
    const cot = grp(ombro, 0, -D.A1, 0);
    mesh(G.membro, o.manga === 'longa' ? mat.blusa : mat.pele, cot, 0.04 * corp * K.b, D.A2, 0.04 * corp * K.b);
    const mao = grp(cot, 0, -D.A2, 0);
    mesh(G.esf, mat.pele, mao, 0.045 * K.b, 0.05 * K.b, 0.04 * K.b, 0, -0.03, 0);
    bracos.push({ ombro, cot, mao });
  });

  /* pescoço e cabeça */
  mesh(G.pesc, mat.pele, tronco, 0.045, D.pesc + 0.02, 0.045, 0, D.torso - 0.01, 0);
  const cabeca = grp(tronco, 0, D.torso + D.pesc + D.cab * 0.9, 0);
  const H = D.cab;
  mesh(G.cabeca, mat.pele, cabeca, H * 0.92, H * 1.08, H, 0, 0, 0);
  if (o.rosto) {
    [1, -1].forEach((s) => mesh(G.box, mat.olho, cabeca, H * 0.2, H * 0.22, H * 0.1, s * H * 0.36, H * 0.08, H * 0.9));
  }
  const cab = o.estiloCabelo;
  if (cab === 'curto') mesh(G.hemi, mat.cabelo, cabeca, H * 1.0, H * 0.95, H * 1.08, 0, H * 0.12, -H * 0.06).rotation.x = -0.25;
  else if (cab === 'crespo') mesh(G.cabeca, mat.cabelo, cabeca, H * 1.28, H * 1.12, H * 1.22, 0, H * 0.28, -H * 0.15);
  else if (cab === 'longo') {
    mesh(G.hemi, mat.cabelo, cabeca, H * 1.04, H * 1.0, H * 1.1, 0, H * 0.1, -H * 0.08).rotation.x = -0.3;
    mesh(G.membro, mat.cabelo, cabeca, H * 0.95, H * 2.3, H * 0.4, 0, H * 0.35, -H * 0.82);
  } else if (cab === 'coque') {
    mesh(G.hemi, mat.cabelo, cabeca, H * 1.0, H * 0.95, H * 1.06, 0, H * 0.12, -H * 0.06).rotation.x = -0.3;
    mesh(G.esf, mat.cabelo, cabeca, H * 0.42, H * 0.42, H * 0.42, 0, H * 1.0, -H * 0.55);
  } else if (cab === 'trancas') {
    mesh(G.hemi, mat.cabelo, cabeca, H * 1.04, H * 1.0, H * 1.08, 0, H * 0.12, -H * 0.06).rotation.x = -0.3;
    [-0.6, -0.2, 0.2, 0.6].forEach((x) => mesh(G.membro, mat.cabelo, cabeca, H * 0.2, H * 1.4, H * 0.2, x * H, H * 0.0, -H * 0.95));
  }
  const ch = o.chapeu;
  if (ch === 'bone') {
    mesh(G.hemi, mat.calca, cabeca, H * 1.1, H * 0.95, H * 1.12, 0, H * 0.22, 0);
    mesh(G.box, mat.calca, cabeca, H * 1.0, H * 0.07, H * 0.8, 0, H * 0.34, H * 1.05);
  } else if (ch === 'capacete') {
    mesh(G.hemi, mat.acento, cabeca, H * 1.2, H * 1.05, H * 1.25, 0, H * 0.14, -H * 0.04);
    mesh(G.box, mat.olho, cabeca, H * 1.0, H * 0.28, H * 0.12, 0, H * 0.5, H * 1.06);
  } else if (ch === 'touca') {
    mesh(G.hemi, mat.acento, cabeca, H * 1.07, H * 0.9, H * 1.12, 0, H * 0.2, -H * 0.04).rotation.x = -0.2;
  }

  /* acessórios */
  const ac = {};
  const A = o.acessorios;
  if (A.indexOf('mochila') >= 0) {
    const g = grp(tronco, 0, D.torso * 0.5, -0.125 * corp - 0.16); ac.mochila = g;
    mesh(G.box, mat.acento, g, 0.38, 0.44, 0.3);
    mesh(G.box, mat.extra, g, 0.2, 0.2, 0.012, 0, 0.0, -0.155);
    [1, -1].forEach((s) => mesh(G.box, mat.calca, tronco, 0.05, D.torso * 0.75, 0.02, s * D.sw * 0.55, D.torso * 0.52, 0.13 * corp * K.l + 0.005));
  }
  if (A.indexOf('colete') >= 0) {
    const h = D.torso * 0.84, y0 = 0.09;
    mesh(G.torso, mat.acento, tronco, D.sw * 1.2, h, 0.155 * corp * K.l, 0, y0, 0.0);
    [0.3, 0.62].forEach((f) => {
      const yy = y0 + h * f, r = (0.8 + 0.2 * f) * 1.2 * D.sw * 1.02;
      mesh(G.torso, mat.extra, tronco, r, 0.035, 0.157 * corp * K.l * (0.8 + 0.2 * f) * 1.02, 0, yy, 0);
    });
  }
  if (A.indexOf('avental') >= 0) {
    mesh(G.box, mat.acento, tronco, D.sw * 1.75, D.torso * 0.62, 0.02, 0, D.torso * 0.12, 0.13 * corp * K.l + 0.012);
    mesh(G.box, mat.acento, corpo, D.hw * 3.3, 0.38 * D.L1 / 0.43, 0.02, 0, -0.2, 0.125 * corp * K.l + 0.012);
  }
  if (A.indexOf('gravata') >= 0) {
    mesh(G.box, mat.acento, tronco, 0.05, D.torso * 0.58, 0.02, 0, D.torso * 0.28, 0.13 * corp * K.l + 0.012);
    mesh(G.box, mat.extra, tronco, 0.13, D.torso * 0.14, 0.018, 0, D.torso * 0.78, 0.13 * corp * K.l + 0.01);
  }
  if (A.indexOf('radio') >= 0) mesh(G.box, mat.olho, tronco, 0.05, 0.11, 0.035, -D.sw * 0.55, D.torso * 0.72, 0.16 * corp * K.l);
  if (A.indexOf('sacola') >= 0) {
    const g = grp(bracos[1].mao, 0, -0.03, 0.02); ac.sacola = g;
    mesh(G.box, mat.acento, g, 0.26, 0.3, 0.13, 0, -0.22, 0);
    mesh(G.box, mat.extra, g, 0.1, 0.1, 0.005, 0, -0.2, 0.07);
    mesh(G.cil, mat.olho, g, 0.012, 0.1, 0.012, 0.06, -0.05, 0);
    mesh(G.cil, mat.olho, g, 0.012, 0.1, 0.012, -0.06, -0.05, 0);
  }
  if (A.indexOf('balde') >= 0) {
    const g = grp(bracos[1].mao, 0, -0.03, 0.02); ac.balde = g;
    mesh(G.balde, mat.acento, g, 0.12, 0.26, 0.12, 0, -0.38, 0);
    mesh(G.cil, mat.olho, g, 0.1, 0.012, 0.1, 0, -0.12, 0);
  }
  if (A.indexOf('rodo') >= 0) {
    const g = grp(bracos[0].mao, 0, -0.04, 0.0); ac.rodo = g;
    const hs = mesh(G.cil, mat.extra, g, 0.014, 1.15, 0.014, 0, 0.15, 0.0);
    mesh(G.box, mat.acento, g, 0.4, 0.04, 0.07, 0, -0.42, 0);
  }
  if (A.indexOf('maleta') >= 0) {
    const g = grp(bracos[0].mao, 0, -0.04, 0); ac.maleta = g;
    mesh(G.box, mat.olho, g, 0.05, 0.3, 0.4, 0, -0.22, 0);
    mesh(G.box, mat.olho, g, 0.1, 0.02, 0.1, 0, -0.06, 0);
  }
  /* celular (pose celular) */
  { const g = grp(bracos[1].mao, 0, -0.04, 0.02); ac.celular = g;
    mesh(G.box, mat.olho, g, 0.075, 0.15, 0.014, 0, -0.04, 0.0);
    mesh(G.box, mkMat(T, 'basic', 0x9ad0ff), g, 0.062, 0.128, 0.004, 0, -0.04, 0.009);
    g.visible = false; }
  /* caixa (pose caixa) */
  const caixa = grp(tronco, 0, D.torso * 0.52, 0.31 * D.sw / 0.2 * 0.9);
  mesh(G.box, mat.papelao, caixa, 0.4, 0.3, 0.32);
  mesh(G.box, mat.extra, caixa, 0.06, 0.302, 0.322);
  caixa.visible = false; ac.caixa = caixa;

  const p = {
    grupo, corpo, tronco, cabeca, pernas, bracos, mat, acessorios: ac, caixa, dim: D,
    opcoes: o, pose: o.pose, alturaAssento: 0.5, alturaQuadril: D.quadH * o.escala,
    estado: { fase: Math.random() * PI * 2, pose: null, w: 1, snap: null, out: null, off: Math.random() * 100, t: 0 }
  };

  /* criança de mão dada */
  if (o.filho && !kid) {
    const f = criar(T, {
      tipo: 'base', idade: 'crianca', genero: Math.random() < 0.5 ? 'f' : 'm', escala: 0.66,
      pele: o.pele, cabelo: o.cabelo, estiloCabelo: Math.random() < 0.5 ? 'crespo' : 'curto',
      cores: { blusa: ROUPA_VIVA[(Math.random() * ROUPA_VIVA.length) | 0], calca: JEANS[(Math.random() * JEANS.length) | 0], sapato: 0xf0f0f0, acento: 0xffffff },
      calcaTipo: 'bermuda', acessorios: [], material: o.material
    });
    f.grupo.position.set(0.5, 0, 0.02);
    f.maoDada = true;
    grupo.add(f.grupo);
    p.filho = f;
  }
  animar(p, 0, 0, { pose: o.pose });
  return p;
}

/* ==================================================================== IK */
/* ângulos "para frente" a partir da vertical, plano sagital (z frente, y cima) */
function ik2(L1, L2, tz, ty, dir) {
  let d = Math.hypot(tz, ty);
  const mx = L1 + L2 - 1e-3, mn = Math.abs(L1 - L2) + 1e-3;
  if (d > mx) { tz *= mx / d; ty *= mx / d; d = mx; }
  if (d < mn) { tz *= mn / d; ty *= mn / d; d = mn; }
  const base = Math.atan2(tz, -ty);
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const t1 = base + dir * A;
  const z1 = L1 * Math.sin(t1), y1 = -L1 * Math.cos(t1);
  const t2 = Math.atan2(tz - z1, -(ty - y1));
  return [t1, t2];
}
/* ponto do referencial do quadril -> referencial do tronco (com inclinação) */
function paraTronco(lean, z, y) {
  const yp = y - 0.07, c = Math.cos(lean), s = Math.sin(lean);
  return [-yp * s + z * c, yp * c + z * s];
}
function bracoPara(p, out, lado, zT, yT) { /* alvo no referencial do tronco */
  const D = p.dim, r = ik2(D.A1, D.A2, zT, yT - (D.torso - 0.07), -1);
  const k = lado > 0 ? 'E' : 'D';
  let dc = r[1] - r[0]; while (dc < -PI) dc += 2 * PI; while (dc > PI) dc -= 2 * PI;
  out['ombro' + k + 'f'] = r[0]; out['cot' + k] = dc;
}
function pernaPara(p, out, lado, zT, yT) { /* alvo do tornozelo rel. ao quadril */
  const D = p.dim, r = ik2(D.L1, D.L2, zT, yT, 1);
  const k = lado > 0 ? 'E' : 'D';
  let dj = r[0] - r[1]; while (dj < -PI) dj += 2 * PI; while (dj > PI) dj -= 2 * PI;
  out['coxa' + k + 'f'] = r[0]; out['joe' + k] = dj;
}

/* ============================================================ pose -> alvo */
function nova() {
  return { quadX: 0, quadY: null, quadZ: 0, corpoRz: 0, lean: 0, twist: 0, roll: 0,
    coxaEf: 0, coxaDf: 0, coxaEz: 0.02, coxaDz: 0.02, joeE: 0.05, joeD: 0.05,
    ombroEf: 0, ombroDf: 0, ombroEz: 0.07, ombroDz: 0.07, cotE: 0.12, cotD: 0.12,
    cabX: 0, cabY: 0, cabZ: 0, peOffE: 0, peOffD: 0 };
}
function ciclo(p, S, out, v, correr, leve) {
  const D = p.dim, Lm = D.L1 + D.L2;
  const esc = (function () { let s = 1; for (let o = p.grupo; o; o = o.parent) s *= o.scale.x; return s; })();
  const vl = Math.max(0.01, v / esc);
  const A = correr ? clamp(0.5 + 0.08 * vl, 0.55, 0.85) : clamp(0.28 + 0.1 * vl, 0.28, 0.48) * (leve ? 0.7 : 1);
  const f = clamp(vl / (4 * Lm * Math.sin(A)), 0.35, 4);
  S.fase += S.dt * f * PI * 2;
  const ph = S.fase, s1 = Math.sin(ph), s2 = -s1;
  out.coxaEf = A * s1; out.coxaDf = A * s2;
  const kmax = correr ? 1.55 : 0.95;
  out.joeE = 0.08 + kmax * Math.pow(Math.max(0, Math.cos(ph - 0.35)), 2);
  out.joeD = 0.08 + kmax * Math.pow(Math.max(0, Math.cos(ph + PI - 0.35)), 2);
  const braco = correr ? 0.95 : 0.6;
  out.ombroEf = -s1 * A * braco * 1.2; out.ombroDf = -s2 * A * braco * 1.2;
  out.cotE = (correr ? 1.3 : 0.2) + 0.25 * Math.max(0, out.ombroEf);
  out.cotD = (correr ? 1.3 : 0.2) + 0.25 * Math.max(0, out.ombroDf);
  out.twist = (correr ? 0.22 : 0.12) * s1;
  out.lean = correr ? 0.22 : 0.04;
  out.quadX = 0.018 * s1; out.corpoRz = 0.035 * s1;
  out.cabY = -out.twist * 0.6; out.cabX = -out.lean * 0.6;
  out.coxaEz = 0.03; out.coxaDz = 0.03;
  /* pé: levantar o calcanhar na impulsão */
  out.peOffE = Math.max(0, -out.coxaEf) * 0.5; out.peOffD = Math.max(0, -out.coxaDf) * 0.5;
}
function alvoPose(p, pose, S, v, op) {
  const out = nova(), D = p.dim, t = S.t + S.off;
  const mao = p.maoDada;
  if (pose === 'parado') {
    out.quadX = 0.012 * Math.sin(t * 0.6); out.corpoRz = 0.012 * Math.sin(t * 0.6);
    out.coxaEf = 0.02 * Math.sin(t * 0.6); out.coxaDf = -0.02 * Math.sin(t * 0.6);
    out.ombroEf = 0.03 * Math.sin(t * 1.1); out.ombroDf = -0.03 * Math.sin(t * 1.1);
    out.lean = 0.02 + 0.01 * Math.sin(t * 1.7); out.cabY = 0.3 * Math.sin(t * 0.37); out.cabX = 0.04 * Math.sin(t * 0.5);
  } else if (pose === 'andar' || pose === 'correr') {
    ciclo(p, S, out, v, pose === 'correr', false);
  } else if (pose === 'caixa') {
    ciclo(p, S, out, Math.min(v, 1.0), false, true);
    out.lean = -0.1; out.twist = 0; out.cabX = 0.1;
    const zc = 0.31 * D.sw / 0.2 * 0.9, yc = D.torso * 0.52;
    bracoPara(p, out, 1, zc * 0.9, yc); bracoPara(p, out, -1, zc * 0.9, yc);
    out.ombroEz = 0.0; out.ombroDz = 0.0;
  } else if (pose === 'celular') {
    out.lean = 0.04; out.cabX = 0.4; out.cabY = 0.1 * Math.sin(t * 0.4);
    out.quadX = 0.012 * Math.sin(t * 0.6);
    bracoPara(p, out, -1, 0.2, D.torso + 0.03);
    out.ombroDz = -0.05;
  } else if (pose === 'sentado') {
    const s = clamp(op && op.assento != null ? op.assento : p.alturaAssento, 0.3, 0.55);
    const th = 1.5; /* coxa quase horizontal; joelho calculado p/ o pé tocar o chão */
    const vv = clamp((s - D.pe - D.L1 * Math.cos(th)) / D.L2, -1, 1);
    const kn = th - Math.acos(vv);
    out.quadY = s; out.coxaEf = th; out.coxaDf = th; out.joeE = kn; out.joeD = kn;
    out.coxaEz = 0.1; out.coxaDz = 0.1;
    out.lean = 0.12 + 0.02 * Math.sin(t * 1.4); out.cabX = -0.05; out.cabY = 0.4 * Math.sin(t * 0.3);
    const kz = D.L1 * Math.sin(th), ky = -D.L1 * Math.cos(th);
    [1, -1].forEach((l) => { const q = paraTronco(out.lean, kz * 0.95, ky + 0.07 + 0.04); bracoPara(p, out, l, q[0], q[1]); });
    out.ombroEz = 0.12; out.ombroDz = 0.12;
  } else if (pose === 'pedalar') {
    const g = Object.assign({}, GEOM_BIKE, p.opcoes.geom || {}), ped = S.cadencia != null ? S.cadencia : 0;
    S.fase += S.dt * ped * PI * 2;
    out.quadY = 0; out.lean = 0.55; out.cabX = -0.4;
    [1, -1].forEach((l) => {
      const psi = S.fase + (l > 0 ? 0 : PI);
      pernaPara(p, out, l, g.cz + g.r * Math.sin(psi) - 0.02, g.cy - g.r * Math.cos(psi) + D.pe + 0.03);
      const q = paraTronco(out.lean, g.bz, g.by); bracoPara(p, out, l, q[0], q[1]);
    });
    out.coxaEz = 0.06; out.coxaDz = 0.06; out.ombroEz = 0.18; out.ombroDz = 0.18;
    out.quadX = 0.01 * Math.sin(S.fase); out.cotE += 0.0;
  } else if (pose === 'moto') {
    const g = Object.assign({}, GEOM_MOTO, p.opcoes.geom || {});
    out.quadY = 0; out.lean = 0.28; out.cabX = -0.2;
    [1, -1].forEach((l) => {
      pernaPara(p, out, l, g.pz, g.py + D.pe + 0.02);
      const q = paraTronco(out.lean, g.bz, g.by); bracoPara(p, out, l, q[0], q[1]);
    });
    out.coxaEz = 0.18; out.coxaDz = 0.18; out.ombroEz = 0.15; out.ombroDz = 0.15;
    out.cabY = 0.05 * Math.sin(t * 0.4);
  } else {
    return alvoPose(p, 'parado', S, v, op);
  }
  /* criança de mão dada: braço E do adulto / D da criança fixos */
  if (mao && (pose === 'andar' || pose === 'parado')) {
    if (p.opcoes.idade === 'crianca') { out.ombroDz = 0.78; out.ombroDf = -0.1; out.cotD = 0.1; }
  }
  if (p.filho && (pose === 'andar' || pose === 'parado')) { out.ombroEz = 0.2; out.ombroEf = 0.02; out.cotE = 0.12; }
  if (out.quadY == null) {
    const h = (th, k) => D.L1 * Math.cos(th) + D.L2 * Math.cos(th - k);
    out.quadY = Math.max(h(out.coxaEf, out.joeE), h(out.coxaDf, out.joeD)) + D.pe;
  }
  return out;
}

/* ============================================================== ANIMAR */
const CHAVES = Object.keys(nova());
function misturar(a, b, w) {
  const o = {};
  for (let i = 0; i < CHAVES.length; i++) {
    const k = CHAVES[i];
    const x = a[k] == null ? b[k] : a[k], y = b[k] == null ? a[k] : b[k];
    o[k] = (x == null && y == null) ? null : lerp(x, y, w);
  }
  return o;
}
function aplicar(p, o) {
  const D = p.dim;
  /* altura do quadril: pé mais baixo no chão */
  const qy = o.quadY;
  p.corpo.position.set(o.quadX, qy, o.quadZ);
  p.corpo.rotation.set(0, 0, o.corpoRz);
  p.tronco.rotation.set(o.lean, o.twist, o.roll);
  const L = p.pernas[0], R = p.pernas[1];
  L.coxa.rotation.set(-o.coxaEf, 0, o.coxaEz); R.coxa.rotation.set(-o.coxaDf, 0, -o.coxaDz);
  L.joelho.rotation.x = o.joeE; R.joelho.rotation.x = o.joeD;
  L.pe.rotation.x = o.coxaEf - o.joeE + o.peOffE; R.pe.rotation.x = o.coxaDf - o.joeD + o.peOffD;
  p.bracos[0].ombro.rotation.set(-o.ombroEf, 0, o.ombroEz); p.bracos[1].ombro.rotation.set(-o.ombroDf, 0, -o.ombroDz);
  p.bracos[0].cot.rotation.x = -o.cotE; p.bracos[1].cot.rotation.x = -o.cotD;
  p.cabeca.rotation.set(o.cabX, o.cabY, o.cabZ);
}
function animar(p, t, dt, op) {
  op = op || {};
  const S = p.estado, pose = op.pose || p.pose;
  S.dt = dt; S.t = t;
  if (op.cadencia != null) S.cadencia = op.cadencia;
  if (pose !== S.pose) { S.snap = S.out; S.pose = pose; S.w = S.snap ? 0 : 1; p.pose = pose; }
  S.w = Math.min(1, S.w + dt / 0.28);
  const v = op.velocidade != null ? op.velocidade : (pose === 'correr' ? 3.2 : pose === 'caixa' ? 0.9 : 1.25);
  const alvo = alvoPose(p, pose, S, v, op);
  const out = S.snap && S.w < 1 ? misturar(S.snap, alvo, ease(S.w)) : alvo;
  S.out = out;
  aplicar(p, out);
  p.caixa.visible = pose === 'caixa' || !!op.caixa;
  if (p.acessorios.celular) p.acessorios.celular.visible = pose === 'celular';
  /* acessórios que balançam */
  const ac = p.acessorios, sw = Math.sin(S.fase);
  const andando = pose === 'andar' || pose === 'correr' || pose === 'caixa';
  if (ac.sacola) ac.sacola.rotation.x = andando ? 0.18 * Math.sin(S.fase + 0.6) : 0.02;
  if (ac.balde) ac.balde.rotation.x = andando ? 0.1 * sw : 0;
  if (ac.mochila) ac.mochila.position.y = p.dim.torso * 0.5 + (andando ? 0.012 * Math.cos(2 * S.fase) : 0);
  if (p.filho) {
    const fo = { pose: pose === 'andar' ? 'andar' : 'parado', velocidade: v };
    animar(p.filho, t, dt, fo);
  }
  return p;
}

/* =========================================================== utilitários */
function atualizarCores(p, cores) {
  Object.keys(cores || {}).forEach((k) => {
    if (k === 'pele' || k === 'cabelo') p.mat[k].color.setHex(cores[k]);
    else if (p.mat[k]) p.mat[k].color.setHex(cores[k]);
  });
  return p;
}
function clonar(T, p, sobre) {
  const op = Object.assign({}, p.opcoes, sobre || {});
  op.cores = Object.assign({}, p.opcoes.cores, (sobre && sobre.cores) || {});
  return criar(T, op);
}
function liberar(p) { /* descarta materiais (geometrias são compartilhadas) */
  Object.keys(p.mat).forEach((k) => p.mat[k].dispose());
  if (p.filho) liberar(p.filho);
}
function pick(r, a) { return a[Math.min(a.length - 1, Math.floor(r() * a.length))]; }
function aleatoria(T, tipo, r) {
  r = r || Math.random;
  const pf = PERFIS[tipo] || {};
  const pFem = { faixineira: 0.8, entregador: 0.2, executivo: 0.4, seguranca: 0.12, morador: 0.55, base: 0.5 }[tipo];
  const genero = r() < pFem ? 'f' : 'm';
  const op = {
    tipo, genero, pele: pick(r, PELES), cabelo: pick(r, CABELOS),
    corpulencia: 0.88 + r() * 0.32, altura: 0.94 + r() * 0.12, escala: 1,
    estiloCabelo: genero === 'f' ? pick(r, ['crespo', 'longo', 'coque', 'trancas', 'curto']) : pick(r, ['curto', 'curto', 'crespo', 'careca']),
    cores: {}
  };
  if (tipo === 'base' || tipo === 'morador') {
    op.cores.blusa = r() < 0.6 ? pick(r, ROUPA_VIVA) : pick(r, ROUPA_NEUTRA);
    op.cores.calca = r() < 0.6 ? pick(r, JEANS) : pick(r, ROUPA_NEUTRA);
    op.cores.sapato = pick(r, [0x222222, 0x5a4636, 0xe8e8e8, 0x3a3a52]);
    op.cores.acento = pick(r, ROUPA_VIVA);
    if (genero === 'm' && r() < 0.35) op.calcaTipo = 'bermuda';
    if (tipo === 'morador') { op.filho = r() < 0.35; if (!op.filho && r() < 0.4) op.acessorios = []; }
  } else if (tipo === 'entregador') {
    op.cores.blusa = pick(r, [0x2b2f36, 0x3a3f48, 0xe8e8e8]);
    op.cores.calca = pick(r, JEANS.concat([0x1a1a1a]));
    op.cores.acento = pick(r, [0xe8472b, 0xf2b01e, 0x2aa7d9, 0xa646e0]);
    op.veiculo = r() < 0.55 ? 'bike' : 'moto';
    if (genero === 'm' && r() < 0.4) op.calcaTipo = 'bermuda';
  } else if (tipo === 'faixineira') {
    op.cores.blusa = pick(r, [0x4f9fd1, 0x6bbf8a, 0xe8e8e8, 0xd96d8a]);
    op.cores.calca = pick(r, [0x2f3f5a, 0x1f2a3d, 0xe8e8e8]);
    op.cores.acento = pick(r, [0xf2f2f2, 0xf0e0a0, 0x8fd0f0]);
    if (genero === 'm') { op.chapeu = 'bone'; op.acessorios = ['rodo']; op.estiloCabelo = 'curto'; }
    else op.acessorios = r() < 0.5 ? ['avental', 'balde'] : ['avental', 'rodo'];
  } else if (tipo === 'executivo') {
    const t = pick(r, [0x25304a, 0x2f3338, 0x3b3f46, 0x1d2a3f]);
    op.cores.blusa = t; op.cores.calca = t; op.cores.acento = pick(r, [0xa8283a, 0x2a5aa8, 0x2a2a2a, 0xc0a040]);
    if (genero === 'f') op.estiloCabelo = pick(r, ['longo', 'coque']);
  } else if (tipo === 'seguranca') {
    op.cores.blusa = pick(r, [0xe8e8e8, 0x2a3550]);
  }
  return criar(T, op);
}

/* ======================================================= veículos simples */
function criarBicicleta(T) {
  const m = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.3, flatShading: true });
  const g = new T.Group(), qua = m(0x39414f), pre = m(0x16181c), cro = m(0xb8bdc6);
  const r = 0.34, rodas = [];
  [-0.5, 0.5].forEach((z) => {
    const w = new T.Group(); w.position.set(0, r, z); g.add(w);
    const t = new T.Mesh(new T.TorusGeometry(r, 0.03, 6, 20), pre); t.rotation.y = PI / 2; w.add(t);
    for (let i = 0; i < 4; i++) { const s = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, r * 2, 4), cro); s.rotation.x = i * PI / 4; w.add(s); }
    rodas.push(w);
  });
  const tubo = (a, b, rad, mt) => { const d = new T.Vector3().subVectors(b, a), L = d.length();
    const me = new T.Mesh(new T.CylinderGeometry(rad, rad, L, 6), mt); me.position.copy(a).addScaledVector(d, 0.5);
    me.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); g.add(me); return me; };
  const V = (y, z) => new T.Vector3(0, y, z);
  tubo(V(r, -0.5), V(0.62, -0.1), 0.02, qua); tubo(V(0.3, 0.12), V(0.62, -0.1), 0.02, qua);
  tubo(V(r, -0.5), V(0.3, 0.12), 0.02, qua); tubo(V(0.3, 0.12), V(0.88, 0.4), 0.022, qua);
  tubo(V(0.62, -0.1), V(0.9, 0.38), 0.02, qua); tubo(V(0.88, 0.4), V(r, 0.5), 0.02, qua);
  tubo(V(0.62, -0.1), V(0.9, -0.1), 0.018, qua);
  const bar = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.5, 6), pre); bar.rotation.z = PI / 2; bar.position.set(0, 1.0, 0.44); g.add(bar);
  const selim = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.26), pre); selim.position.set(0, 0.93, -0.1); g.add(selim);
  const crank = new T.Group(); crank.position.set(0, 0.3, 0.12); g.add(crank);
  [1, -1].forEach((s) => {
    const arm = new T.Mesh(new T.BoxGeometry(0.025, 0.16, 0.025), cro); arm.position.set(s * 0.1, -0.08 * s, 0); arm.rotation.x = 0;
    const ped = new T.Mesh(new T.BoxGeometry(0.1, 0.02, 0.1), pre); ped.position.set(s * 0.13, -0.16 * s, 0);
    const c = new T.Group(); c.add(arm, ped); c.rotation.x = 0; crank.add(c);
  });
  return { grupo: g, rodas, crank, raio: r, altAssento: 0.95, zAssento: -0.1, tipo: 'bike' };
}
function criarMoto(T) {
  const m = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.3, flatShading: true });
  const g = new T.Group(), pre = m(0x16181c), cor = m(0xc9ccd2), mot = m(0x4a4f58);
  const r = 0.3, rodas = [];
  [-0.62, 0.62].forEach((z) => {
    const w = new T.Group(); w.position.set(0, r, z); g.add(w);
    const t = new T.Mesh(new T.CylinderGeometry(r, r, 0.12, 14), pre); t.rotation.z = PI / 2; w.add(t);
    const h = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.14, 8), cor); h.rotation.z = PI / 2; w.add(h);
    const fx = new T.Mesh(new T.BoxGeometry(0.02, 0.5, 0.02), cor); fx.rotation.x = 0; w.add(fx);
    rodas.push(w);
  });
  const add = (geo, mt, x, y, z, rx) => { const me = new T.Mesh(geo, mt); me.position.set(x, y, z); if (rx) me.rotation.x = rx; g.add(me); return me; };
  add(new T.BoxGeometry(0.28, 0.3, 0.55), cor, 0, 0.62, 0.1);
  add(new T.BoxGeometry(0.3, 0.26, 0.4), mot, 0, 0.42, -0.05);
  add(new T.BoxGeometry(0.22, 0.08, 0.55), pre, 0, 0.8, -0.28);
  add(new T.BoxGeometry(0.3, 0.26, 0.26), cor, 0, 0.9, 0.36, -0.3);
  add(new T.CylinderGeometry(0.022, 0.022, 0.62, 6), pre, 0, 0.58, 0.58, 0.3);
  const bar = add(new T.CylinderGeometry(0.014, 0.014, 0.7, 6), pre, 0, 1.0, 0.5); bar.rotation.z = PI / 2;
  add(new T.CylinderGeometry(0.05, 0.05, 0.4, 8), mot, 0.2, 0.28, -0.4, 0).rotation.z = PI / 2;
  const fs = add(new T.SphereGeometry(0.08, 6, 4), new T.MeshBasicMaterial({ color: 0xfff3c0 }), 0, 0.98, 0.6);
  return { grupo: g, rodas, crank: null, raio: r, altAssento: 0.82, zAssento: -0.28, tipo: 'moto' };
}
function montar(p, v) {
  v.grupo.add(p.grupo);
  p.grupo.position.set(0, v.altAssento, v.zAssento);
  p.grupo.rotation.set(0, 0, 0);
  p.pose = v.tipo === 'moto' ? 'moto' : 'pedalar';
  p.veiculoMontado = v;
  return p;
}
function animarVeiculo(v, p, dt, velocidade) {
  const w = (velocidade * dt) / v.raio;
  v.rodas.forEach((r) => { r.rotation.x += w; });
  if (v.crank && p) v.crank.rotation.x = -p.estado.fase;
  return velocidade * 0.45; /* cadência (rev/s) sugerida p/ animar(p,…,{cadencia}) */
}

return {
  criar, animar, clonar, aleatoria, atualizarCores, liberar, rng,
  criarBicicleta, criarMoto, montar, animarVeiculo,
  tipos: Object.keys(PERFIS), poses: ['parado', 'andar', 'correr', 'sentado', 'caixa', 'celular', 'pedalar', 'moto'],
  PELES, CABELOS, ROUPA_VIVA, ROUPA_NEUTRA, JEANS, DEFAULTS, PERFIS, GEOM_BIKE, GEOM_MOTO
};
};

const Pessoas=factory();

/* ===== pedestres ===== */
const PED={g:null,l:[],t:0};
function pedestres(){const T=THREE,g=new T.Group();g.scale.setScalar(CS);sceneC.add(g);PED.g=g;
 const R=Pessoas.rng(77),rl=k=>(k-4.5)*17,SWK=3.4,ESC=1.7,pk=a=>a[Math.floor(R()*a.length)];
 const mk=(tipo,o)=>{const p=Pessoas.aleatoria(T,tipo,R);p.grupo.scale.setScalar(ESC);return p;};
 const walker=(tipo,a,b,vis,pose,v)=>{const p=mk(tipo);const e={p,a,b,s:R(),v:v||1.2,k:'w',vis:vis||(()=>1),pose:pose||'andar',root:p.grupo};g.add(p.grupo);PED.l.push(e);return e;};
 const stand=(tipo,x,z,ry,vis,pose)=>{const p=mk(tipo);p.grupo.position.set(x,.15,z);p.grupo.rotation.y=ry;Pessoas.animar(p,0,0,{pose:pose||'parado'});const e={p,k:'s',vis:vis||(()=>1),pose:pose||'parado',root:p.grupo};g.add(p.grupo);PED.l.push(e);return e;};
 const ride=(a,b,vis)=>{const p=Pessoas.aleatoria(T,'entregador',R);p.grupo.scale.setScalar(1);const moto=p.opcoes.veiculo==='moto',v=moto?Pessoas.criarMoto(T):Pessoas.criarBicicleta(T);Pessoas.montar(p,v);v.grupo.scale.setScalar(ESC);g.add(v.grupo);const e={p,v,a,b,s:R(),vel:moto?9:5,k:'b',vis:vis||(()=>1),root:v.grupo};PED.l.push(e);return e;};
 /* gente da cidade nova: poucos, em ruas fixas, com colegas de terno */
 [[4,-60,60],[3,-50,40],[5,-30,50]].forEach(([k,x0,x1])=>{const z=rl(k)+SWK;walker('base',[x0,z],[x1,z],0,0,1.3);walker('executivo',[x1,z+.1],[x0,z+.1],0,0,1.4);});
 for(let i=0;i<4;i++)walker('executivo',[-14+i*3,rl(5)+SWK],[18+i*3,rl(5)+SWK],0,0,1.5);
 [[2,-70,70],[3,-70,70],[6,-70,70]].forEach(([k,x0,x1],i)=>{ride([x0,rl(k)-2.2],[x1,rl(k)-2.2]);if(i<2)ride([x1,rl(k)+2.2],[x0,rl(k)+2.2]);});
 /* fila da porta de serviço da Torre Central: só depois da Fase 2 começar */
 const f2=()=>FASE()>=2;
 for(let i=0;i<8;i++)stand('faixineira',-.7+(i%2)*1.4,-8.5-i*1.7,0,f2,i%3===0?'celular':'parado');
 /* vila: bem mais gente por metro quadrado */
 for(let i=0;i<9;i++){const x=rl(1)+(R()<.5?-SWK:SWK),z0=43+R()*8,z1=z0+14+R()*18;walker('morador',R()<.5?[x,z0]:[x,z1],R()<.5?[x,z1]:[x,z0],0,0,.9+R()*.5);}
 for(let i=0;i<5;i++)walker('morador',[-95+R()*10,rl(7)+(R()<.5?-SWK:SWK)],[-48+R()*10,rl(7)+(R()<.5?-SWK:SWK)],0,0,.8+R()*.4);
 for(let i=0;i<6;i++)stand(i<4?'morador':'base',-76+R()*30,rl(8)+(R()<.5?-SWK:SWK)+R()*.6,R()*6.28,0,i%2?'celular':'parado');
}
function pedUpd(dt){if(!PED.g)return;PED.t+=dt;const t=PED.t,cp=camC.position;
 for(const e of PED.l){const on=e.vis();let x,z,ry;
  if(e.k==='s'){e.root.visible=on;if(!on)continue;const d=e.root.position.clone().multiplyScalar(CS).distanceTo(cp);if(d>300){e.root.visible=false;continue;}Pessoas.animar(e.p,t,dt,{pose:e.pose});continue;}
  const L=Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1])||1,sp=e.k==='b'?e.vel:e.v;
  e.s=(e.s+dt*sp/L);let u=e.s%1;if(e.k==='w'){const q=u*2;u=q<1?q:2-q;}
  const dx=(e.b[0]-e.a[0])/L,dz=(e.b[1]-e.a[1])/L;x=e.a[0]+(e.b[0]-e.a[0])*u;z=e.a[1]+(e.b[1]-e.a[1])*u;
  const back=e.k==='w'&&(e.s%1)*2>=1;ry=Math.atan2(back?-dx:dx,back?-dz:dz);
  e.root.position.set(x,e.k==='b'?0:.15,z);e.root.rotation.y=ry;
  const d=e.root.position.clone().multiplyScalar(CS).distanceTo(cp);e.root.visible=on&&d<300;if(!e.root.visible)continue;
  if(e.k==='b'){const c=Pessoas.animarVeiculo(e.v,e.p,dt,sp);Pessoas.animar(e.p,t,dt,{cadencia:c});}
  else Pessoas.animar(e.p,t,dt,{pose:'andar',velocidade:sp});}}

/* ================= FASES 3 A 5 ================= */
const FT={1:'Fase 1 · Moradia',2:'Fase 2 · Trabalho e renda',3:'Fase 3 · Participação',4:'Fase 4 · Emissões',5:'Fase 5 · Aterrar na Casa 17'};
Object.assign(PQ,{
 r1:['Sala da audiência','A audiência pública de hoje tem 3.200 inscritos e uma sala com 40 cadeiras. A ata da audiência já está impressa e assinada, com a data de ontem.'],
 r2:['Totem de inscrição','Para participar da consulta é preciso informar o número do cadastro oficial. Quem foi apagado na limpeza de base não passa da primeira tela.'],
 r3:['Faixa da consulta','A faixa de 2019 diz "Meridiano ouviu você". A consulta durou três dias úteis, sempre às 14h. Das sugestões registradas, 41 vieram de moradores de áreas afetadas.'],
 r4:['Registro dos moradores','A vila fez o próprio registro, em papel e áudio: 212 famílias, com nome, endereço e foto. A ata do Consórcio não cita nenhuma delas.'],
 s1:['Estação de monitoramento','As 14 estações de qualidade do ar ficam dentro do perímetro do projeto, entre canteiros plantados. O painel só lê essas.'],
 s2:['Aterro da borda','A 600 m da última estação há um aterro de resíduos da obra e uma nuvem baixa que o painel não mede. A Casa 17 fica a favor do vento.'],
 s3:['Usina a gás','A energia da cidade "limpa" vem de uma usina a gás na borda, fora do perímetro. As emissões dela não entram no indicador.'],
 s4:['Canteiro de créditos','O Consórcio compensa o que emite comprando créditos de plantio em outra região. No papel são 120.000 árvores. O terreno cadastrado comporta 9.000.'],
 t1:['Água','A água da cidade vem do rio que passa ao lado da Casa 17. A captação fica rio acima. O esgoto da obra desce rio abaixo, sem tratamento, até a vila.'],
 t2:['Quem mantém a cidade acesa','Os turnos da noite, a limpeza das torres e as entregas dependem de quem mora fora do perímetro. A cidade usa esse trabalho e não registra essas pessoas.'],
 t3:['O que a cidade descarta','Entulho, resíduo e lixo eletrônico vão para a borda. Quem vive ali convive com isso há quinze anos.']});
const PH={
 3:{n:'Participação',det0:'participação',intro:'O indicador de Participação está conforme: 12 audiências públicas, 3.200 participantes e 94% de aprovação da consulta. Posso emitir o certificado.',q:'Mesma pergunta, outro indicador: quem foi ouvido de fato?',
  rows:[['Audiências públicas realizadas','8','12'],['Participantes inscritos','2.000','3.200'],['Aprovação da consulta','80%','94%']],
  det:'Inscritos com cadastro oficial: <b>3.200</b><br>Moradores de áreas afetadas: <b>41</b><br>Atas redigidas na véspera: <b>12 de 12</b><br>Casa 17 e entorno: <b>sem convite</b>',
  rec:'Todos os indicadores constam como conformes. Recomendo assinar.',
  opts:[['Validar a consulta como conforme','c',()=>1,''],['Anexar o registro dos moradores','a',()=>st.q.r4,'O anexo precisa do registro feito pelos moradores. Ele só existe se alguém for buscá-lo no campo.'],['Marcar Participação como pendente','p',()=>nQ()>=3,'Uma pendência precisa de pelo menos três observações anexadas.'],['Pedir nova audiência presencial','v',()=>st.q.r2,'O pedido exige uma evidência sobre as barreiras de inscrição.']],
  out:{c:'O certificado sai. Participação continua verde e a ata de ontem, assinada com a data de hoje, vira o registro oficial da consulta.',
   a:'O registro dos moradores entra como anexo. Não tem valor deliberativo, mas passa a constar no processo e o coordenador precisa citá-lo na próxima reunião.',
   p:'A pendência chega ao Consórcio. A próxima audiência será presencial, com a mesma lista de inscritos.',
   v:'O pedido cita o cadastro oficial como barreira. A coordenação responde que vai "avaliar formatos".'}},
 4:{n:'Emissões',det0:'qualidade do ar',intro:'O indicador de Emissões está conforme: o ar foi classificado como "bom" em 98% dos dias e foram plantadas 120.000 árvores. Posso emitir o selo verde.',q:'Último indicador: onde o ar é medido, e onde não é?',
  rows:[['Dias com ar classificado "bom"','90%','98%'],['Árvores plantadas','100.000','120.000'],['Estações de monitoramento','10','14']],
  det:'Estações dentro do perímetro do projeto: <b>14</b><br>Estações fora do perímetro: <b>0</b><br>Créditos de compensação comprados: <b>120.000</b><br>Fontes de emissão na borda: <b>não listadas</b>',
  rec:'O selo verde está pronto para emissão. Recomendo certificar.',
  opts:[['Certificar o selo verde','c',()=>1,''],['Recusar o selo','r',()=>nQ()>=3&&st.q.s2,'A recusa precisa de três observações, entre elas a do aterro da borda.'],['Anexar medição independente','a',()=>st.q.s2&&st.q.s3,'A medição independente exige as observações do aterro e da usina.'],['Pedir vistoria da borda','v',()=>st.q.s2,'A vistoria exige uma evidência sobre o que existe fora do perímetro medido.']],
  out:{c:'O selo sai. As 14 estações e o plantio sustentam a nota. O aterro e a usina seguem fora do cálculo.',
   r:'O selo é recusado. O Consórcio recorre no mesmo dia e o indicador passa a "em revisão".',
   a:'A medição independente entra no processo e mostra o dobro de partículas na borda. O Consórcio contesta o equipamento.',
   v:'A vistoria da borda é autorizada, com data a combinar.'}}};
const doneF=f=>f===1?st.fim:f===2?st.fim2:st.fin[f];
function iniciar(f){st['f'+f]=1;st.q={};OB.length=0;const P=PH[f];
 if(f<5)OB.push(['painel','Conferir '+P.n+' no painel',()=>st.pnl[f],'painel'],['feed','Lançar o drone no terminal',()=>st.fdl[f],'terminal'],['pistas','Reunir observações',()=>nQ()>=4,'arquivo'],['fim','Decidir no certificado',()=>st.fin[f],'impressora']);
 else OB.push(['inv','Reunir o inventário de dependências ('+3+' observações)',()=>nQ()>=3,'arquivo'],['pouso','Pousar na Casa 17 (terminal)',()=>st.fin[5],'terminal']);
 if(lst){lst.remove();lst=null;}$('#marks').innerHTML='';upObj();
 if(f<5)ui(`<h2>Indicador ${f} · ${P.n}</h2>`+call('sis','MERIDIANA','assistente do projeto',P.intro)+`<p class="sm">${P.q}</p>`+bt('close','Começar a auditoria'));
 else ui(`<h2>Última etapa · Aterrar</h2>`+call('dilson','Dilson','morador da Casa 17','O Consórcio avisou que a Casa 17 entra no próximo ciclo da obra. Antes de você assinar o certificado final, olha de onde vem o que a cidade usa. Eu mostro o que sei, mas é o seu drone que precisa ver.')+`<p class="sm">Reúna as três observações do inventário e depois pouse na Casa 17.</p>`+bt('close','Começar'));}
PH[5]={n:'Aterrar'};
A.fase3=()=>iniciar(3);A.fase4=()=>iniciar(4);A.fase5=()=>iniciar(5);
const lancar0=A.lancar;A.lancar=()=>{st.fdl[FASE()]=1;lancar0();};
const terminal0=A.terminal;A.terminal=()=>{terminal0();const f=FASE();let h='';
 if(f>=2&&f<5&&doneF(f)&&!st['f'+(f+1)])h=bt('fase'+(f+1),'Abrir o indicador: '+PH[f+1].n,'','on');
 if(f===3&&doneF(3)&&!st.f4)h=bt('fase4','Abrir o indicador: Emissões','','on');
 if(f===4&&doneF(4)&&!st.f5)h=bt('fase5','Último passo: aterrar na Casa 17','','on');
 if(f===5&&nQ()>=3&&!st.fin[5])h=bt('pousar','Pousar na Casa 17','','on');
 if(h)pn.querySelector('[data-a=close]').insertAdjacentHTML('beforebegin',h);};
const pan0=A.painel;A.painel=()=>{const f=FASE();if(f<3)return pan0();
 if(f===5){ui(`<h2>Índice de Desenvolvimento Meridiano</h2><table><tr><th>Indicador</th><th>Resultado</th></tr><tr><td>Moradia</td><td class="ok">conforme</td></tr><tr><td>Trabalho e renda</td><td class="ok">conforme</td></tr><tr><td>Participação</td><td class="ok">conforme</td></tr><tr><td>Emissões</td><td class="ok">conforme</td></tr></table><p>IDM: <b>94 de 100</b>. Falta o certificado final.</p>`+bt('close','Sair'));return;}
 const P=PH[f];st.pnl[f]=1;upObj();ui(`<h2>Painel de indicadores · ${P.n}</h2><table><tr><th>Indicador</th><th>Meta</th><th>Resultado</th><th></th></tr>`+P.rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="ok">conforme</td></tr>`).join('')+`</table>`+bt('detp','Detalhar '+P.det0)+bt('close','Sair'));};
A.detp=()=>{const P=PH[FASE()];ui(`<h2>${P.det0[0].toUpperCase()+P.det0.slice(1)} · detalhe</h2>`+(nQ()?`<p>${P.det}</p>`:'<p class="sm">Campo recolhido. Só abre com uma observação de campo anexada.</p>')+bt('painel','‹ Voltar'));};
const imp0=A.impressora;A.impressora=()=>{const f=FASE();if(f<3)return imp0();
 if(f===5){ui(`<h2>Certificado final do IDM</h2><p>A assinatura final só pode ser dada depois do pouso na Casa 17. Use o terminal do drone.</p>`+bt('close','Voltar'));return;}
 const P=PH[f];ui(`<h2>Certificado de Conclusão · ${P.n}</h2>`+call('sis','MERIDIANA','assistente do projeto',P.rec)+`<p class="sm">Observações no caderno: ${nQ()} de 4.</p>`+(st.fdl[f]?bt('boss',f===3?'Receber o Moderador (confronto)':'Receber a Máquina de Créditos (confronto)','','on'):'')+P.opts.map(o=>bt('decp',o[0],o[1])).join('')+bt('close','Voltar'));};
A.decp=v=>{const f=FASE(),P=PH[f],o=P.opts.find(x=>x[1]===v);
 if(!o[2]()){ui(`<h2>Pedido sem fundamento</h2><p>${o[3]}</p>`+bt('impressora','‹ Voltar'));return;}
 st.res[f]=v;st.fin[f]=1;if(v==='c')st.inf++;upObj();
 ui(`<h2 style="color:#ffb13b">Fase ${f} concluída</h2><p>${P.out[v]}</p><p class="sm">Próximo: ${f===3?'Emissões':'a Casa 17'}. Volte ao terminal do drone.</p>`+(v==='c'?'':bt('boss','Atender a convocação','','on'))+bt('close','Continuar na sala'));};
A.pousar=()=>{closeUI();st.lastf=1;toast('O Consórcio detectou o pouso. Ele manda a última barreira de drones.',5000);startFight();};
A.final=()=>{const inv=['t1','t2','t3'].map(k=>`<li>${PQ[k][0]}: ${PQ[k][1]}</li>`).join('');
 ui(`<h2>Casa 17</h2><p>O drone está sobre o quintal. Dilson sai e olha para cima. No seu painel, o certificado final do IDM espera a assinatura.</p><h3>Inventário de dependências</h3><ul class="sm">${inv}</ul><p class="sm">Influência do Consórcio sobre você: ${st.inf}.</p>`+
  bt('desfecho','Global: assinar o IDM','g')+bt('desfecho','Local: assinar com ressalva só para a vila','l')+bt('desfecho','Terrestre: recusar o IDM e pousar','t'));};
A.desfecho=v=>{st.fin[5]=1;st.fim5=v;upObj();
 const T={g:['Global',`Você assina. O IDM de Meridiano sai com nota máxima e a cidade passa a ser citada como modelo. Três semanas depois a Casa 17 entra no corredor da obra. A demolição é feita de madrugada, com laudo da engenharia do Consórcio. O número de Dilson deixa de atender. O relatório fica no site, com a sua assinatura.${st.inf>=3?' Seu contrato é renovado por mais três anos.':''}`],
  l:['Local',`Você assina o IDM com uma ressalva: a Casa 17 e as quadras do entorno ficam fora do certificado, sob regime próprio. O Consórcio aceita porque a ressalva é pequena. A vila fica de pé, cercada de tapume dos dois lados, com água e luz ligadas por um acordo que vale enquanto durar o seu contrato. O resto de Meridiano segue como estava.`],
  t:['Terrestre',`Você recusa a assinatura. O drone desce e pousa no quintal da Casa 17. Dilson abre o portão. O inventário de dependências (água, turnos da noite, resíduo, o ar da borda) vai para a ata da vila e para quem quiser ler. O Consórcio rescinde o seu contrato no mesmo dia${st.inf>=3?' e bloqueia o seu acesso a todos os relatórios anteriores':''}. A cidade continua acesa, mas agora existe um documento que diz de onde ela vem. Você fica com a janela do apartamento e o número de Dilson.`]}[v];
 ui(`<h2 style="color:#ff4fd8">Final ${T[0]}</h2><p>${T[1]}</p><p class="sm">Meridiano: o que é desenvolvimento, e para quem, depois que o estrago está posto.</p>`+bt('reiniciar','Jogar de novo','','on')+bt('close','Ficar na sala'));};
A.reiniciar=()=>location.reload();
/* ----- missão de campo (run-and-gun) ----- */
const MS={on:0,cv:null,x:null};
function startMissao(cfg,id){closeUI();sairFeed();
 if(!MS.cv){const c=document.createElement('canvas');c.width=960;c.height=420;c.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(98vw,1100px);z-index:30;border:2px solid #00e5d8;background:#05060f';document.body.appendChild(c);MS.cv=c;MS.x=c.getContext('2d');c.addEventListener('mousedown',()=>{keys.k=1;setTimeout(()=>keys.k=0,130);});}
 MS.cv.style.display='block';let sd=cfg.seed||1;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
 const S=MS.s={cfg,id,len:cfg.len,x:60,y:340,vy:0,hp:5,face:1,cd:0,inv:0,pw:0,cam:0,t:0,bl:[],eb:[],en:[],pk:[],pf:[],end:0,sky:[]};
 for(let i=0;i<40;i++)S.sky.push([rnd()*S.len*.4,60+rnd()*160,30+rnd()*50,60+rnd()*150]);
 for(let x=500;x<S.len-300;x+=180+rnd()*140){const r=rnd();S.en.push(r<.5?{k:'s',x,y:340,hp:2,cd:rnd()*2}:r<.8?{k:'d',x,y:150+rnd()*90,hp:2,cd:rnd()*2,b:rnd()*6}:{k:'t',x,y:340,hp:4,cd:rnd()*2});if(rnd()<.35)S.pf.push({x:x+60,w:140,y:270});}
 S.pk.push({x:S.len*.35,y:300,k:'L'},{x:S.len*.7,y:300,k:'L'});MS.on=1;}
function mFim(v){MS.on=0;MS.cv.style.display='none';const S=MS.s;
 if(v){pista(S.id);closeUI();ui(`<h2>Missão concluída</h2><p>${PQ[S.id][1]}</p><p class="sm">Anotado no caderno de campo.${S.pw?' O Consórcio registrou que você usou uma licença dele. A influência dele sobre você subiu.':''}</p>`+bt('close','Voltar à sala'));}
 else ui(`<h2 style="color:#ff4fd8">Drone abatido</h2><p>O sinal cai antes de você chegar ao fim do percurso.</p>`+bt('missao','Tentar de novo',S.id,'on')+bt('close','Desistir'));}
A.missao=id=>{const h=hot.find(x=>x.id===id);startMissao(h.mis,id);};
function mUpdate(dt){const S=MS.s,k=keys,c=MS.x;dt=Math.min(dt,.04);S.t+=dt;
 if(k.escape){k.escape=0;mFim(0);return;}
 const dx=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0);if(dx)S.face=dx;S.x=Math.max(S.cam+20,Math.min(S.len,S.x+dx*190*dt));
 let ground=340;for(const p of S.pf)if(S.x>p.x&&S.x<p.x+p.w&&S.y<=p.y+4)ground=Math.min(ground,p.y);
 if((k.w||k.arrowup||k[' '])&&S.y>=ground-1&&S.vy>=0)S.vy=-430;S.vy+=1100*dt;S.y+=S.vy*dt;if(S.y>=ground){S.y=ground;S.vy=0;}
 S.cam=Math.max(S.cam,Math.min(S.len-960,S.x-300));
 S.cd-=dt;S.inv-=dt;if((k.k||k.j||k.x)&&S.cd<=0){S.cd=S.pw?.14:.2;const f=S.face;S.bl.push({x:S.x,y:S.y-26,vx:f*520,vy:0,t:1});if(S.pw){S.bl.push({x:S.x,y:S.y-26,vx:f*500,vy:-110,t:1},{x:S.x,y:S.y-26,vx:f*500,vy:110,t:1});}}
 for(const b of S.bl){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;}
 const hurtP=()=>{if(S.inv>0)return;S.hp--;S.inv=1.1;};
 for(const e of S.en){if(e.hp<=0)continue;const near=Math.abs(e.x-S.x)<620;e.cd-=dt;
  if(e.k==='s'){if(near&&Math.abs(e.x-S.x)>140)e.x+=(S.x<e.x?-1:1)*55*dt;if(near&&e.cd<=0){e.cd=1.8;S.eb.push({x:e.x,y:e.y-26,vx:(S.x<e.x?-1:1)*260,vy:0,t:2.5});}}
  else if(e.k==='d'){e.y=e.y+Math.sin(S.t*2+e.b)*30*dt;if(near)e.x+=(S.x<e.x?-1:1)*70*dt;if(near&&e.cd<=0){e.cd=2;const a=Math.atan2(S.y-24-e.y,S.x-e.x);S.eb.push({x:e.x,y:e.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,t:3});}}
  else if(near&&e.cd<=0){e.cd=1.5;const a=Math.atan2(S.y-24-(e.y-20),S.x-e.x);S.eb.push({x:e.x,y:e.y-20,vx:Math.cos(a)*240,vy:Math.sin(a)*240,t:3});}
  for(const b of S.bl)if(b.t>0&&Math.abs(b.x-e.x)<22&&Math.abs(b.y-(e.y-(e.k==='d'?0:24)))<28){b.t=0;e.hp--;}
  if(Math.abs(e.x-S.x)<20&&Math.abs(e.y-S.y)<34)hurtP();}
 for(const b of S.eb){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;if(Math.abs(b.x-S.x)<14&&Math.abs(b.y-(S.y-24))<26){b.t=0;hurtP();}}
 for(const p of S.pk)if(!p.got&&Math.abs(p.x-S.x)<26&&Math.abs(p.y-(S.y-20))<40){p.got=1;S.pw=1;st.inf++;upObj();toast('Licença do Consórcio: tiro triplo. A influência dele sobre você aumentou.',3500);}
 S.bl=S.bl.filter(b=>b.t>0);S.eb=S.eb.filter(b=>b.t>0);
 if(S.hp<=0){mFim(0);return;}if(S.x>=S.len-10){mFim(1);return;}
 /* desenho */
 const cam=S.cam,col=S.cfg.cor;c.fillStyle='#070914';c.fillRect(0,0,960,420);
 const g=c.createLinearGradient(0,0,0,340);g.addColorStop(0,'#0a0a24');g.addColorStop(1,'#2a0f3a');c.fillStyle=g;c.fillRect(0,0,960,340);
 for(const s of S.sky){const x=((s[0]-cam*.3)%1400+1400)%1400-100;c.fillStyle='#10132e';c.fillRect(x,340-s[3],s[2],s[3]);c.fillStyle=col;c.globalAlpha=.5;for(let w=0;w<s[3];w+=18)if((w*7+(s[0]|0))%5<2)c.fillRect(x+6,340-s[3]+w,5,5);c.globalAlpha=1;}
 c.fillStyle='#0c0e1a';c.fillRect(0,340,960,80);c.fillStyle=col;c.fillRect(0,340,960,2);
 for(let x=-(cam%40);x<960;x+=40){c.globalAlpha=.25;c.fillRect(x,342,1,78);c.globalAlpha=1;}
 for(const p of S.pf){c.fillStyle='#14182c';c.fillRect(p.x-cam,p.y,p.w,10);c.fillStyle=col;c.fillRect(p.x-cam,p.y,p.w,2);}
 for(const p of S.pk)if(!p.got){c.fillStyle='#ffb13b';c.fillRect(p.x-cam-10,p.y-10+Math.sin(S.t*4)*3,20,20);c.fillStyle='#000';c.font='bold 12px monospace';c.fillText('L',p.x-cam-4,p.y+5+Math.sin(S.t*4)*3);}
 for(const e of S.en){if(e.hp<=0)continue;const x=e.x-cam;if(x<-40||x>1000)continue;
  if(e.k==='s'){c.fillStyle='#2a3350';c.fillRect(x-9,e.y-34,18,34);c.fillStyle='#ff4a2a';c.fillRect(x-9,e.y-40,18,7);c.fillRect(x+(S.x<e.x?-18:9),e.y-26,10,4);}
  else if(e.k==='d'){c.fillStyle='#2a3350';c.fillRect(x-14,e.y-6,28,12);c.fillStyle='#ff4a2a';c.fillRect(x-4,e.y-2,8,5);c.fillStyle=col;c.fillRect(x-22,e.y-9,44,2);}
  else{c.fillStyle='#2a3350';c.fillRect(x-14,e.y-16,28,16);c.fillStyle='#ff4a2a';c.fillRect(x-6,e.y-24,12,10);}}
 const px=S.x-cam;if(S.inv<=0||((S.t*20)|0)%2){c.fillStyle='#00e5d8';c.fillRect(px-8,S.y-34,16,34);c.fillStyle='#e8fffb';c.fillRect(px-6,S.y-40,12,8);c.fillStyle='#ffb13b';c.fillRect(px+(S.face>0?6:-18),S.y-26,12,5);}
 c.fillStyle='#e8fffb';for(const b of S.bl)c.fillRect(b.x-cam-4,b.y-1,8,3);c.fillStyle='#ff4a2a';for(const b of S.eb)c.fillRect(b.x-cam-3,b.y-3,6,6);
 c.fillStyle='#e8fffb';c.font='13px monospace';c.fillText(S.cfg.titulo,14,22);for(let i=0;i<5;i++){c.fillStyle=i<S.hp?'#ff4fd8':'#2a2040';c.fillRect(14+i*20,32,16,10);}
 c.fillStyle='#10182a';c.fillRect(700,16,240,8);c.fillStyle=col;c.fillRect(700,16,240*Math.min(1,S.x/S.len),8);
 c.fillStyle='#7fb';c.font='11px monospace';c.fillText('A/D mover · W ou Espaço pular · K, J ou clique atirar · caixa L: Licença do Consórcio (tiro triplo; aumenta a influência dele) · Esc desistir',14,412);}
/* ----- chefes das fases 3 e 4 ----- */
const BK=()=>({3:'mod',4:'cred'})[FASE()]||'ar';
function credMesh(){const g=new THREE.Group(),M=(c,e)=>new THREE.MeshStandardMaterial({color:c,metalness:.2,roughness:.55,emissive:e||0x000000,emissiveIntensity:.6});
 const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
 add(new THREE.BoxGeometry(3.4,.8,2.6),M(0x1b3a2a),0,.4,0);add(new THREE.BoxGeometry(2.8,2.8,2),M(0x2a5a3c,0x0a2a14),0,2.2,0);
 const c=document.createElement('canvas');c.width=512;c.height=300;const x=c.getContext('2d');x.fillStyle='#021208';x.fillRect(0,0,512,300);x.fillStyle='#7dff9a';x.font='bold 40px monospace';x.textAlign='center';x.fillText('CRÉDITOS DE',256,100);x.fillText('COMPENSAÇÃO',256,150);x.font='28px monospace';x.fillText('120.000 árvores',256,215);
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const sc=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.35),new THREE.MeshBasicMaterial({map:tx}));sc.position.set(0,2.5,1.02);g.add(sc);
 add(new THREE.BoxGeometry(.9,.16,.1),M(0x000000,0x7dff9a),0,1.4,1.02);
 for(const s of[-1,1]){add(new THREE.CylinderGeometry(.22,.22,2.4,10),M(0x2a2f3a),s*1.9,2,.2);add(new THREE.SphereGeometry(.4,12,10),M(0x2a5a3c,0x7dff9a),s*1.9,3.3,.2);}
 add(new THREE.SphereGeometry(.7,16,12,0,6.3,0,1.6),M(0x3a8a4c,0x2aff6a),0,3.7,0);
 const l1=new THREE.PointLight(0x7dff9a,10,8,2);l1.position.set(0,2.6,2.2);g.add(l1);return g;}
function modAnim(t){const m=Bo.mod;if(!m)return;m.rig.position.y=Math.sin(t*3)*.15;m.head.rotation.y=Math.sin(t*1.3)*.25;
 if(t-(Bo.lt||0)>.2){Bo.lt=t;const s=m.sx;s.fillStyle='#050812';s.fillRect(0,0,m.SW,m.SH);const st_=Bo.stun>0,cc=st_?'#ff2a2a':'#3ff2ff',bl=(t%4)<.15;s.fillStyle=cc;
  if(!bl){s.fillRect(230,190,170,150);s.fillRect(620,190,170,150);}else{s.fillRect(230,260,170,16);s.fillRect(620,260,170,16);}
  for(let i=0;i<20;i++){const h=20+Math.abs(Math.sin(t*5+i))*(st_?10:80);s.fillRect(180+i*34,560-h,22,h);}
  s.fillStyle='#ff2bd6';s.font='bold 56px monospace';s.textAlign='center';s.fillText(st_?'ERRO 429':'MODERANDO',512,100);m.screenTex.needsUpdate=true;}}
function credAnim(t){if(Bo.m)Bo.m.children[0].rotation.z=Math.sin(t*2)*.01;}
async function startBossX(){const k=BK();await startBoss();if(k==='ar'){Bo.kind='ar';Bo.nome='ARANHA';return;}
 Bo.kind=k;Bo.mt=1e9;sceneR.remove(Bo.m);const g=new THREE.Group();
 if(k==='mod'){const md=moderador();Bo.mod=md;md.boss.scale.setScalar(.4);md.boss.traverse(o=>{if(o.isMesh&&o.material&&o.material.metalness>.4){o.material.metalness=.3;o.material.emissive=o.material.emissive||new THREE.Color();}});g.add(md.boss);
  const a=new THREE.PointLight(0x3ff2ff,14,10,2);a.position.set(0,3,2);g.add(a);const b=new THREE.PointLight(0xff2bd6,10,10,2);b.position.set(0,2,-2);g.add(b);Bo.nome='MODERADOR';Bo.max=1500;Bo.win='O Moderador saiu do ar. Iara: "Anota isso na ata."';}
 else{g.add(credMesh());Bo.nome='MÁQUINA DE CRÉDITOS';Bo.max=1800;Bo.win='A máquina parou de emitir crédito. Iara: "Anota isso no relatório."';}
 Bo.m=g;g.position.copy(Bo.p);sceneR.add(g);Bo.hp=Bo.max;Bo.ph=100;
 toast(k==='mod'?'Bit: ele moderou a sua entrada. Não desvie dos círculos, saia deles.':'Bit: a máquina emite créditos em cima de você. Fica fora dos círculos.',6500);}
const boss0=A.boss;A.boss=()=>{const k=BK();if(k==='ar')return boss0();
 ui(k==='mod'?`<h2 style="color:#ff4fd8">O Moderador</h2><p>Quando uma audiência corre mal, o Consórcio ativa o Moderador. Ele decide quem fala, por quanto tempo e quem sai da transmissão. O que ele remove deixa de ter existido para a ata.</p><p>Objetivo: derrubar o Moderador antes que ele derrube você.</p>`:`<h2 style="color:#ff4fd8">Máquina de Créditos</h2><p>Para cada tonelada emitida, o Consórcio compra um crédito de plantio em outro lugar. A máquina faz essa conta e a executa em cima de quem estiver no caminho.</p><p>Objetivo: derrubar a máquina antes que ela derrube você.</p>`
  +`<h3>Como jogar</h3><p>WASD: mover · Espaço: jogar página do caderno (cada observação aumenta o dano)<br>Círculos vermelhos no chão: golpe em 1 segundo, saia de dentro. Linha vermelha: avanço, e depois do avanço ele fica tonto e leva o dobro.</p>`+bt('bossgo','Entrar em combate','','on')+bt('close','Voltar'));};
A.bossgo=startBossX;

/* ================= LOOP ================= */
const dicaEl=document.createElement('div');dicaEl.className='sm';dicaEl.style.cssText='position:fixed;left:12px;bottom:8px;z-index:4;color:#7fb;opacity:.8;font-size:.72em;pointer-events:none';document.body.appendChild(dicaEl);
const keys={};addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=1;if(!started||MS.on)return;
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
 if(MS.on){mUpdate(dt);return;}
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
  dr.x=Math.max(-190,Math.min(190,dr.x));dr.z=Math.max(-190,Math.min(190,dr.z));
  {const d='';if(dicaEl.textContent!==d)dicaEl.textContent=d;}
  camC.position.set(dr.x,dr.y,dr.z+Math.sin(t*1.3)*.15);const f=new THREE.Vector3(-Math.sin(dr.yaw)*Math.cos(dr.pitch),Math.sin(dr.pitch),-Math.cos(dr.yaw)*Math.cos(dr.pitch));camC.lookAt(camC.position.clone().add(f));
  if(sceneC.userData.cityUpd)sceneC.userData.cityUpd(dt);if(modo==='feed')pedUpd(dt);
  {const bk=sceneC.userData.bike,q2=sceneC.userData.q2;if(bk){const z=((t*6)%260)-130;bk.position.set(CPOS.bikeX,1.4,z);if(q2)q2.pos.set(CPOS.bikeX,4,z);bk.visible=FASE()===2;}}
  $('#alt').textContent=Math.round(dr.y);const d=new Date(2031,2,14,3,12,0,0);d.setSeconds(Math.floor(t));$('#ts').textContent=d.toLocaleString('pt-BR');marcadores();}
}

/* ================= INICIALIZAÇÃO ================= */
resize();await montarSala();await jogador();await npcs();await montarCidade();pedestres();
for(const h of hot){const bm=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,160,10,1,true),new THREE.MeshBasicMaterial({color:h.id==='fl'?0x888888:0x00ffe0,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));bm.position.set(h.pos.x,h.pos.y+80,h.pos.z);sceneC.add(bm);h.beam=bm;}

/* ===== conteúdo da Fase 2 ===== */
{for(const h of hot)h.f=1;
 const bike=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,3.4),new THREE.MeshStandardMaterial({color:0x222222,emissive:0xffb13b,emissiveIntensity:1.6}));const bl=new THREE.PointLight(0xffb13b,25,14,2);bike.add(bl);sceneC.add(bike);sceneC.userData.bike=bike;
 const q2={id:'q2',pos:new THREE.Vector3(CPOS.bikeX,4,0),nome:'Entregador'};
 hot.push({id:'q1',pos:CPOS.q1.clone(),nome:'Centro de distribuição',f:2},q2,{id:'q3',pos:CPOS.q3.clone(),nome:'Portão de serviço',f:2},{id:'q4',pos:CPOS.q4.clone(),nome:'Painel de vagas',f:2});q2.f=2;sceneC.userData.q2=q2;
 for(const h of hot)if(h.f===2){const bm=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,160,10,1,true),new THREE.MeshBasicMaterial({color:0xffb13b,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));bm.position.set(h.pos.x,h.pos.y+80,h.pos.z);bm.visible=false;sceneC.add(bm);h.beam=bm;}}

/* ===== hotspots das Fases 3 a 5 ===== */
{const fx=CPOS.fx,mk3=(f,cor,L)=>L.forEach(([id,nome,i,y,k,mis])=>{const h={id,nome,pos:fx(i,y,k),f};if(mis)h.mis=mis;hot.push(h);
  const bm=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,160,10,1,true),new THREE.MeshBasicMaterial({color:cor,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}));bm.position.set(h.pos.x,h.pos.y+80,h.pos.z);bm.visible=false;sceneC.add(bm);h.beam=bm;});
 mk3(3,0xff4fd8,[['r1','Sala da audiência',4,10,3],['r2','Totem de inscrição',7,6,4],['r3','Faixa da consulta',2,8,2],['r4','Beco dos moradores',1,5,5,{txt:'Os moradores do entorno da Casa 17 fizeram o próprio registro das famílias. Para buscá-lo, o drone atravessa o beco e passa pelos seguranças do Consórcio, que usam soldados e drones de patrulha.',titulo:'Missão de campo · Beco dos moradores',len:4200,seed:3,cor:'#ff4fd8'}]]);
 mk3(4,0x7dff9a,[['s1','Estação de monitoramento',4,8,2],['s2','Aterro da borda',8,6,8],['s3','Usina a gás',0,8,0],['s4','Canteiro de créditos',8,6,5,{txt:'O terreno que o Consórcio apresenta como plantio de compensação fica atrás de uma cerca de obra, vigiado por patrulhas. O drone precisa atravessar o percurso para conferir o que existe lá.',titulo:'Missão de campo · Canteiro de créditos',len:5200,seed:5,cor:'#7dff9a'}]]);
 mk3(5,0x00e5d8,[['t1','Água',4,3,6],['t2','Quem mantém a cidade acesa',8,5,1],['t3','O que a cidade descarta',8,6,8]]);}

rp=new RenderPass(sceneR,camR);
composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4}));composer.addPass(rp);bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.6,.9);composer.addPass(bloom);composer.addPass(new OutputPass());resize();
upObj();
let last=0;function loop(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;update(dt,ts/1000);composer.render();requestAnimationFrame(loop);}requestAnimationFrame(loop);
$('#go').disabled=false;$('#go').textContent='COMEÇAR';
$('#go').onclick=()=>{started=true;$('#title').style.display='none';setTimeout(()=>A.ajuda(),300);};
window.DBG={npcU:npcUpd,NP,bu:bossUpdate,Bo,startBoss,fu:fightUpdate,keys,F,hit,TG,st,pl,dr,THREE,sceneR,sceneC,camC,camR,enter:entrarFeed,start:()=>$('#go').click(),hot,A,MS,startMissao,iniciar,mFim};
})();
