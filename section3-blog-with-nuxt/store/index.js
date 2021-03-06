import Vuex from 'vuex'
import axios from 'axios'
import Cookie from 'js-cookie'


const createStore = () => {
    return new Vuex.Store({
        state: {
            loadedPosts: [],
            token: null
        },
        mutations: {
            setPosts(state, posts) {
                state.loadedPosts = posts
            },
            addPost(state, post){
                state.loadedPosts.push(post)
            },
            editPost(state, editedPost){
                const postIndex = state.loadedPosts.findIndex(post => {
                    return post.id === editedPost.id
                })
                state.loadedPosts[postIndex] = editedPost
            },
            setToken(state, token) {
                state.token = token
            },
            clearToken(state) {
                state.token = null
            }
        },
        actions: {
            nuxtServerInit(vuexContext, context) {
                return axios.get(process.env.baseUrl + '/posts.json')
                .then(res => {
                    const postsArray = []
                    for(const key in res.data) {
                        postsArray.push({...res.data[key], id: key})
                    }
                    vuexContext.commit('setPosts', postsArray)
                })
                .catch(error => context.error(error))
            },

            addPost(vueContext, post) {
                const createdPost = {
                    ...post,
                    updatedDate: new Date()
                }
                return axios.post(process.env.baseUrl + '/posts.json?auth=' + vueContext.state.token, createdPost)
                    .then(result => {
                        vueContext.commit('addPost', {...createdPost, id: result.data.name})
                    })
                    .catch(error => console.log(error))
            },

            editPost(vueContext, editedPost) {
                return axios.put(process.env.baseUrl +'/posts/' + 
                    editedPost.id + 
                    '.json?auth=' + 
                    vueContext.state.token, editedPost)
                    .then(res => {
                        vueContext.commit('editPost', editedPost)
                    })
                     .catch(e => {console.log(e)}
                )
            },
            setPosts(vuexContext, posts) {
                vuexContext.commit('setPosts', posts)
            },
            
            authenticateUser(vueContext, authData){
                let authUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + process.env.firebaseAPIKey
                if(!authData.isLogin) {
                    authUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + process.env.firebaseAPIKey
                }
                return axios.post(authUrl, {
                    email: authData.email,
                    password: authData.password,
                    returnSecureToken: true
                })
                .then(result => {
                    vueContext.commit('setToken', result.data.idToken)

                    localStorage.setItem('token',
                        result.data.idToken
                    )
                    localStorage.setItem(
                        'tokenExpiration',
                        new Date().getTime() + +result.data.expiresIn * 1000
                    )

                    Cookie.set('jwt',
                        result.data.idToken
                    )
                    Cookie.set('expirationDate',
                        new Date().getTime() + +result.data.expiresIn * 1000
                    )
                    return axios.post('http://localhost:3005/api/track-data' , {
                        data: 'authenticated!'
                    })
                })
                .catch(error => console.log(error))
            },

            initAuth(vuexContext, req) {
                let token;
                let expirationDate;
                if (req) {
                    if(!req.headers.cookie) {
                        return
                    }
                    const jwtCookie = req.headers.cookie
                    .split(';')
                    .find( c => c.trim().startsWith('jwt='))
                    if(!jwtCookie) {
                        return
                    }
                    token = jwtCookie.split('=')[1]
                    
                    expirationDate = req.headers.cookie
                    .split(';')
                    .find( c => c.trim().startsWith('expirationDate='))
                    .split('=')[1]

                } else {
                    token = localStorage.getItem('token')
                    expirationDate = localStorage.getItem('tokenExpiration')
                }

                if (new Date().getTime() > +expirationDate || !token) {
                    vuexContext.dispatch('logoutUser')
                    return
                }
                vuexContext.commit('setToken', token)
            },
            logoutUser(vuexContext) {
                vuexContext.commit('clearToken')
                Cookie.remove('expirationDate')
                Cookie.remove('jwt')
                if (process.client) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('expirationDate')
                }
            }
        },
        getters: {
            loadedPosts(state) {
                return state.loadedPosts
            },
            isAuthenticated(state) {
                return state.token != null
            }
        }
    })
}

export default createStore