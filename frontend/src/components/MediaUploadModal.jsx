import { useEffect, useMemo, useRef, useState } from 'react';
import { Crop, File, Image as ImageIcon, Save, Upload, Video, X } from 'lucide-react';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/heic,image/heif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const RATIOS = { original:null, '1:1':1, '4:5':4/5, '9:16':9/16, '16:9':16/9 };

function fileIcon(file) { if (file.type.startsWith('image/')) return <ImageIcon size={18}/>; if (file.type.startsWith('video/')) return <Video size={18}/>; return <File size={18}/>; }
function formatBytes(bytes) { if (bytes<1024) return `${bytes} B`; if (bytes<1024**2) return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1024**2).toFixed(1)} MB`; }
function readAsDataUrl(file) { return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error(`${file.name} o‘qilmadi.`)); reader.readAsDataURL(file); }); }

async function centerCrop(file, ratioLabel) {
  const ratio=RATIOS[ratioLabel];
  if (!ratio || !file.type.startsWith('image/') || ['image/gif','image/svg+xml','image/heic','image/heif'].includes(file.type)) return file;
  const url=URL.createObjectURL(file);
  try {
    const image=await new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('Rasmni crop qilishning imkoni bo‘lmadi.')); img.src=url; });
    let sourceWidth=image.naturalWidth, sourceHeight=image.naturalHeight, sx=0, sy=0;
    const current=sourceWidth/sourceHeight;
    if (current>ratio) { const next=sourceHeight*ratio; sx=(sourceWidth-next)/2; sourceWidth=next; }
    else { const next=sourceWidth/ratio; sy=(sourceHeight-next)/2; sourceHeight=next; }
    const max=1800;
    let width=sourceWidth, height=sourceHeight;
    if (Math.max(width,height)>max) { const scale=max/Math.max(width,height); width=Math.round(width*scale); height=Math.round(height*scale); }
    const canvas=document.createElement('canvas'); canvas.width=Math.round(width); canvas.height=Math.round(height);
    canvas.getContext('2d').drawImage(image,sx,sy,sourceWidth,sourceHeight,0,0,canvas.width,canvas.height);
    const outputType=file.type==='image/png'?'image/png':'image/jpeg';
    const blob=await new Promise((resolve)=>canvas.toBlob(resolve,outputType,0.9));
    if (!blob) return file;
    const base=file.name.replace(/\.[^.]+$/,'');
    return new File([blob],`${base}-${ratioLabel.replace(':','x')}.${outputType==='image/png'?'png':'jpg'}`,{type:outputType});
  } finally { URL.revokeObjectURL(url); }
}

export default function MediaUploadModal({ open, folders, branches, saving, onClose, onSave, notify }) {
  const [files,setFiles]=useState([]); const [dragging,setDragging]=useState(false); const [ratio,setRatio]=useState('original');
  const [form,setForm]=useState({displayName:'',folderId:'',branchId:'',description:'',altText:'',tags:''});
  const inputRef=useRef(null);
  const preview=useMemo(()=> files.length===1&&files[0].type.startsWith('image/') ? URL.createObjectURL(files[0]) : '',[files]);
  useEffect(()=>()=>{ if(preview) URL.revokeObjectURL(preview); },[preview]);
  useEffect(()=>{ if(!open)return; setFiles([]);setRatio('original');setForm({displayName:'',folderId:'',branchId:'',description:'',altText:'',tags:''}); },[open]);
  if(!open)return null;

  const addFiles=(incoming)=>{ const valid=[]; for(const file of Array.from(incoming||[])){ if(file.size>MAX_BYTES){notify(`${file.name}: 8 MB dan katta.`);continue;} if(!ACCEPT.split(',').includes(file.type)){notify(`${file.name}: bu format qo‘llab-quvvatlanmaydi.`);continue;} valid.push(file); } setFiles((current)=>{ const combined=[...current,...valid].slice(0,6); if(combined.reduce((sum,file)=>sum+file.size,0)>30*1024*1024){notify('Bir yuklashdagi umumiy hajm 30 MB dan oshmasligi kerak.');return current;} return combined; }); };
  const submit=async(event)=>{ event.preventDefault(); if(!files.length)return notify('Kamida bitta fayl tanlang.'); try { const prepared=files.length===1?[await centerCrop(files[0],ratio)]:files; const encoded=await Promise.all(prepared.map(async(file)=>({name:file.name,type:file.type,size:file.size,data:await readAsDataUrl(file)}))); await onSave({files:encoded,displayName:prepared.length===1?form.displayName.trim():'',folderId:form.folderId?Number(form.folderId):null,branchId:form.branchId?Number(form.branchId):null,description:form.description.trim(),altText:form.altText.trim(),tags:form.tags.split(',').map((tag)=>tag.trim()).filter(Boolean)}); } catch(error){notify(error.message);} };
  const change=(name,value)=>setForm((current)=>({...current,[name]:value}));

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&!saving&&onClose()}><form className="content-modal media-upload-modal" onSubmit={submit}><div className="modal-header"><div><span className="modal-icon"><Upload size={21}/></span><div><h2>Media yuklash</h2><p>Drag & drop, crop va duplicate nazorati</p></div></div><button className="icon-button" type="button" onClick={onClose} disabled={saving}><X size={21}/></button></div><div className="media-upload-body"><button type="button" className={`media-dropzone ${dragging?'media-dropzone--active':''}`} onClick={()=>inputRef.current?.click()} onDragOver={(event)=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(event)=>{event.preventDefault();setDragging(false);addFiles(event.dataTransfer.files);}}><span><Upload size={26}/></span><strong>Fayllarni shu yerga tashlang</strong><p>yoki kompyuterdan tanlash uchun bosing</p><small>8 MB · jami 30 MB · 6 tagacha · takror fayl aniqlanadi</small></button><input ref={inputRef} hidden type="file" multiple accept={ACCEPT} onChange={(event)=>addFiles(event.target.files)}/>
    {files.length>0&&<div className="media-selected-files">{files.map((file,index)=><div key={`${file.name}-${file.size}-${index}`}><span>{fileIcon(file)}</span><div><strong>{file.name}</strong><small>{formatBytes(file.size)} · {file.type}</small></div><button type="button" onClick={()=>setFiles((current)=>current.filter((_,i)=>i!==index))}><X size={17}/></button></div>)}</div>}
    {preview&&<section className="media-crop-panel"><div className="media-crop-preview" style={{aspectRatio:ratio==='original'?'16/10':ratio.replace(':','/')}}><img src={preview} alt="Crop preview"/></div><div><span><Crop size={17}/> Instagram va video formatlari</span><div>{Object.keys(RATIOS).map((value)=><button type="button" key={value} className={ratio===value?'active':''} onClick={()=>setRatio(value)}>{value==='original'?'Original':value}</button>)}</div><small>Crop markazdan olinadi; original fayl brauzerda xavfsiz qayta ishlanadi.</small></div></section>}
    <div className="form-grid media-upload-fields">{files.length<=1&&<label className="form-field form-field--wide"><span>Ko‘rinadigan nom</span><input value={form.displayName} onChange={(event)=>change('displayName',event.target.value)} placeholder={files[0]?.name||'Media nomi'}/></label>}<label className="form-field"><span>Papka</span><select value={form.folderId} onChange={(event)=>change('folderId',event.target.value)}><option value="">Asosiy kutubxona</option>{folders.map((folder)=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(event)=>change('branchId',event.target.value)}><option value="">Umumiy</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label className="form-field form-field--wide"><span>Tavsif</span><textarea rows={2} value={form.description} onChange={(event)=>change('description',event.target.value)} placeholder="Fayl haqida ichki ma’lumot..."/></label><label className="form-field form-field--wide"><span>Alt matn</span><input value={form.altText} onChange={(event)=>change('altText',event.target.value)} placeholder="Rasm mazmunining qisqa tavsifi"/></label><label className="form-field form-field--wide"><span>Teglar</span><input value={form.tags} onChange={(event)=>change('tags',event.target.value)} placeholder="aksiya, telefon, chirchiq"/><small>Vergul bilan ajrating</small></label></div></div><div className="modal-actions"><button type="button" className="button-ghost" onClick={onClose} disabled={saving}>Bekor qilish</button><button className="button-primary" disabled={saving||!files.length} type="submit"><Save size={18}/>{saving?'Yuklanmoqda...':`${files.length||''} faylni yuklash`}</button></div></form></div>;
}
