import jwt from 'jsonwebtoken';

export const generateToken = (user) => {

  return jwt.sign({ dbId: user.id }, process.env.ACCESS_TOKEN_SECRET);
}; 
