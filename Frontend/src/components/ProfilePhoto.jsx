import { useEffect, useState } from 'react';
import { FaCamera, FaUserCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/AuthService';
import './ProfilePhoto.css';

const ProfilePhoto = () => {
  const { user, uploadProfilePhoto } = useAuth();
  const [loadedPhoto, setLoadedPhoto] = useState({ userId:null, url:'' });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let objectUrl=''; const requestedUserId=user?.id; if(user?.has_profile_photo) authService.getProfilePhoto(requestedUserId,user?.profile_photo_updated_at).then((blob)=>{if(blob){objectUrl=URL.createObjectURL(blob);setLoadedPhoto({userId:requestedUserId,url:objectUrl});}}).catch(()=>{}); return()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);}; },[user?.id,user?.has_profile_photo,user?.profile_photo_updated_at]);
  const changePhoto=async(event)=>{const file=event.target.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024){setError('Usa una imagen JPG, PNG o WebP de hasta 3 MB.');return;}setUploading(true);setError('');try{await uploadProfilePhoto(file);const url=URL.createObjectURL(file);setLoadedPhoto((current)=>{if(current.url)URL.revokeObjectURL(current.url);return{userId:user?.id,url};});}catch(requestError){setError(requestError.message);}finally{setUploading(false);event.target.value='';}};
  const photoUrl=loadedPhoto.userId===user?.id?loadedPhoto.url:'';
  return <div className="identity-photo-wrap"><div className="identity-photo">{photoUrl?<img src={photoUrl} alt={`Foto de ${user?.full_name}`}/>:<FaUserCircle aria-label="Sin foto de perfil"/>}</div><label className="identity-photo-action"><FaCamera/>{uploading?'Guardando...':'Cambiar foto'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={changePhoto}/></label>{error&&<small className="identity-photo-error">{error}</small>}</div>;
};
export default ProfilePhoto;
