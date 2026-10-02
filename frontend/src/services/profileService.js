import api from './api';

/** GET /api/profile/me */
export const getMyProfile = () => api.get('/profile/me');

/** POST /api/profile — create */
export const createProfile = (data) => api.post('/profile', data);

/** PUT /api/profile — update */
export const updateProfile = (data) => api.put('/profile', data);

/** GET /api/profile/:userId — public view */
export const getUserProfile = (userId) => api.get(`/profile/${userId}`);

/** GET /api/profile/skills — with IDs, for edit mode */
export const getMySkills = () => api.get('/profile/skills');

/** POST /api/profile/skills */
export const addSkill = (skillName) =>
  api.post('/profile/skills', { skill_name: skillName });

/** DELETE /api/profile/skills/:skillId */
export const removeSkill = (skillId) =>
  api.delete(`/profile/skills/${skillId}`);

/** POST /api/profile/picture — multipart file upload */
export const uploadPicture = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/profile/picture', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** DELETE /api/profile/picture */
export const deletePicture = () => api.delete('/profile/picture');

/** POST /api/profile/picture/undo */
export const undoDeletePicture = () => api.post('/profile/picture/undo');


