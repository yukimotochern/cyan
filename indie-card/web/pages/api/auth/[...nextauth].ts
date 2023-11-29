import NextAuth from 'next-auth';
import { authOptions } from '../../../server/services/auth/auth';

export default NextAuth(authOptions);
